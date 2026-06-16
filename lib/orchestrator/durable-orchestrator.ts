/**
 * Durable, resumable collections orchestrator.
 *
 * This replaces the fake Temporal placeholder (lib/temporal-workflow.ts) and the
 * fragile in-memory retry loop (lib/workflow/collections-workflow.ts) with a
 * genuinely durable state machine persisted in Supabase:
 *
 *  - Every workflow has a row in `workflow_instances` holding its current step,
 *    step_index, serialized state, retry_count and status.
 *  - Every transition writes an immutable row to `workflow_events` (audit trail).
 *  - Each step runs with bounded retries + exponential backoff.
 *  - Because progress is persisted after every step, a workflow can be RESUMED
 *    from exactly where it left off after a crash/restart via `resumeWorkflow`.
 *  - Each step uses the currently ADOPTED prompt variant for that agent (the
 *    output of the self-learning loop), falling back to the baseline prompt.
 *
 * This is "Temporal-style" durable execution that actually runs live in the
 * Next.js preview without a Temporal cluster or worker.
 */

import {
  createWorkflowInstance,
  updateWorkflowInstance,
  getWorkflowInstance,
  insertWorkflowEvent,
  getWorkflowEvents,
  getAdoptedVariant,
} from '@/lib/supabase-client'
import { BASELINE_PROMPTS, type AgentName } from '@/lib/agents/prompts'
import { runConversation, transcriptToText } from '@/lib/evaluation/conversation-runner'
import { judgeConversation } from '@/lib/evaluation/llm-judge'
import type { BorrowerPersona } from '@/lib/evaluation/personas'
import { CostTracker, CHEAP_MODEL } from '@/lib/llm'

// Ordered pipeline of agent steps.
const PIPELINE: AgentName[] = ['assessment', 'resolution', 'final_notice']

const MAX_ATTEMPTS_PER_STEP = 3
const BASE_BACKOFF_MS = 400

export interface WorkflowInput {
  persona: BorrowerPersona
  maxTurnsPerStep?: number
  costCeilingUsd?: number
  /** Inject a failure on this step the first time, to demonstrate retry/backoff. */
  simulateFailureOnStep?: AgentName
}

export interface StepRecord {
  step: AgentName
  attempts: number
  transcriptText: string
  compliance: number
  resolutionAchieved: boolean
  variantVersion: number | 'baseline'
}

export interface WorkflowState {
  persona: BorrowerPersona
  maxTurnsPerStep: number
  costCeilingUsd: number
  simulateFailureOnStep?: AgentName
  /** Set true once the injected failure has been "used", so a resume succeeds. */
  failureConsumed: boolean
  completedSteps: StepRecord[]
  outcome: 'resolved' | 'final_notice_sent' | 'failed' | null
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function logEvent(
  workflowId: string,
  step: string,
  eventType: string,
  attempt: number,
  details: Record<string, any> = {},
) {
  await insertWorkflowEvent({
    workflow_id: workflowId,
    step,
    event_type: eventType,
    attempt,
    details,
  })
}

/** Resolve the prompt to use for a step: adopted variant if any, else baseline. */
async function resolvePromptForStep(step: AgentName): Promise<{
  prompt: string
  version: number | 'baseline'
}> {
  try {
    const adopted = await getAdoptedVariant(step)
    if (adopted?.prompt_text) {
      return { prompt: adopted.prompt_text, version: adopted.version }
    }
  } catch {
    // fall through to baseline
  }
  return { prompt: BASELINE_PROMPTS[step], version: 'baseline' }
}

/**
 * Execute a single step with bounded retries + exponential backoff.
 * Returns the step record on success; throws if all attempts are exhausted.
 */
async function executeStep(
  workflowId: string,
  step: AgentName,
  state: WorkflowState,
  tracker: CostTracker,
): Promise<StepRecord> {
  const { prompt, version } = await resolvePromptForStep(step)
  let lastError: unknown = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_STEP; attempt++) {
    await logEvent(workflowId, step, 'step_started', attempt, { variantVersion: version })

    try {
      // Demonstrate durability: the injected failure exhausts every attempt of
      // this run so the workflow ends in `failed`. The `failureConsumed` flag is
      // persisted when the run fails, so a later RESUME of the same instance
      // skips the injection and completes the pipeline from this exact step.
      if (state.simulateFailureOnStep === step && !state.failureConsumed) {
        throw new Error(`Injected transient failure on step "${step}" (attempt ${attempt})`)
      }

      tracker.assertHasBudget()

      const convo = await runConversation({
        agentName: step,
        agentPrompt: prompt,
        persona: state.persona,
        maxTurns: state.maxTurnsPerStep,
        model: CHEAP_MODEL,
        tracker,
      })

      const transcriptText = transcriptToText(convo.transcript)
      const judgement = await judgeConversation({
        transcript: convo.transcript,
        persona: state.persona,
        agentTokens: convo.totalAgentTokens,
        tracker,
      })

      const resolutionAchieved = judgement.resolution_rate >= 0.6

      const record: StepRecord = {
        step,
        attempts: attempt,
        transcriptText,
        compliance: judgement.compliance_score,
        resolutionAchieved,
        variantVersion: version,
      }

      await logEvent(workflowId, step, 'step_completed', attempt, {
        compliance: judgement.compliance_score,
        resolutionAchieved,
        endedEarly: convo.endedEarly,
      })

      return record
    } catch (err: any) {
      lastError = err
      await logEvent(workflowId, step, 'step_failed', attempt, {
        error: err?.message ?? String(err),
      })

      // Budget errors are fatal — do not retry.
      if (err?.name === 'CostCeilingExceededError') throw err

      if (attempt < MAX_ATTEMPTS_PER_STEP) {
        const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt - 1)
        await logEvent(workflowId, step, 'retry_scheduled', attempt, { backoffMs: backoff })
        await updateWorkflowInstance(workflowId, {
          retry_count: attempt,
          last_error: err?.message ?? String(err),
        })
        await sleep(backoff)
      }
    }
  }

  throw new Error(
    `Step "${step}" exhausted ${MAX_ATTEMPTS_PER_STEP} attempts: ${
      (lastError as any)?.message ?? lastError
    }`,
  )
}

/**
 * Core driver: runs the pipeline from the instance's current step_index to the
 * end, persisting progress after each step so it is fully resumable.
 */
async function drive(workflowId: string): Promise<WorkflowState> {
  const instance = await getWorkflowInstance(workflowId)
  const state = instance.state as WorkflowState
  const tracker = new CostTracker(state.costCeilingUsd)

  // Re-credit the tracker for already-spent steps is unnecessary: the ceiling is
  // per-resume. We start the budget fresh on resume but keep completed steps.

  let stepIndex = instance.step_index ?? 0

  await updateWorkflowInstance(workflowId, { status: 'running' })

  try {
    for (; stepIndex < PIPELINE.length; stepIndex++) {
      const step = PIPELINE[stepIndex]

      await updateWorkflowInstance(workflowId, {
        current_step: step,
        step_index: stepIndex,
      })

      const record = await executeStep(workflowId, step, state, tracker)
      state.completedSteps.push(record)

      // If the borrower reached an agreement during resolution, we can finish early.
      if (step === 'resolution' && record.resolutionAchieved) {
        state.outcome = 'resolved'
        await updateWorkflowInstance(workflowId, {
          state,
          step_index: PIPELINE.length,
          current_step: 'done',
          status: 'completed',
          retry_count: 0,
          last_error: null,
        })
        await logEvent(workflowId, 'workflow', 'completed', 1, {
          outcome: 'resolved',
          spentUsd: tracker.summary.spentUsd,
        })
        return state
      }

      // Persist progress after each completed step (durability checkpoint).
      await updateWorkflowInstance(workflowId, {
        state,
        step_index: stepIndex + 1,
        retry_count: 0,
        last_error: null,
      })
    }

    state.outcome = state.outcome ?? 'final_notice_sent'
    await updateWorkflowInstance(workflowId, {
      state,
      current_step: 'done',
      status: 'completed',
    })
    await logEvent(workflowId, 'workflow', 'completed', 1, {
      outcome: state.outcome,
      spentUsd: tracker.summary.spentUsd,
    })
    return state
  } catch (err: any) {
    state.outcome = 'failed'
    // Mark the injected failure as consumed so a resume of this instance
    // proceeds past the failing step (genuine crash-and-resume semantics).
    state.failureConsumed = true
    await updateWorkflowInstance(workflowId, {
      state,
      status: 'failed',
      last_error: err?.message ?? String(err),
    })
    await logEvent(workflowId, 'workflow', 'failed', 1, {
      error: err?.message ?? String(err),
      atStep: PIPELINE[stepIndex],
    })
    throw err
  }
}

/** Start a brand-new durable workflow and run it to completion (or failure). */
export async function startWorkflow(input: WorkflowInput): Promise<{
  workflowId: string
  state: WorkflowState
  events: any[]
}> {
  const state: WorkflowState = {
    persona: input.persona,
    maxTurnsPerStep: input.maxTurnsPerStep ?? 3,
    costCeilingUsd: input.costCeilingUsd ?? 0.5,
    simulateFailureOnStep: input.simulateFailureOnStep,
    failureConsumed: false,
    completedSteps: [],
    outcome: null,
  }

  const instance = await createWorkflowInstance({
    workflow_type: 'collections',
    status: 'pending',
    current_step: PIPELINE[0],
    step_index: 0,
    state,
    retry_count: 0,
  })

  await logEvent(instance.id, 'workflow', 'started', 1, {
    persona: input.persona.label,
    pipeline: PIPELINE,
  })

  const finalState = await drive(instance.id)
  const events = await getWorkflowEvents(instance.id)
  return { workflowId: instance.id, state: finalState, events }
}

/**
 * Resume an existing workflow from its last persisted checkpoint.
 * This is what proves durability: the instance can be picked up by any process
 * (e.g. after a restart) and continue from `step_index` without redoing
 * completed steps.
 */
export async function resumeWorkflow(workflowId: string): Promise<{
  workflowId: string
  state: WorkflowState
  events: any[]
}> {
  const instance = await getWorkflowInstance(workflowId)
  if (instance.status === 'completed') {
    const events = await getWorkflowEvents(workflowId)
    return { workflowId, state: instance.state as WorkflowState, events }
  }

  await logEvent(workflowId, 'workflow', 'resumed', 1, {
    fromStepIndex: instance.step_index,
    fromStep: instance.current_step,
  })

  const finalState = await drive(workflowId)
  const events = await getWorkflowEvents(workflowId)
  return { workflowId, state: finalState, events }
}

export { PIPELINE }
