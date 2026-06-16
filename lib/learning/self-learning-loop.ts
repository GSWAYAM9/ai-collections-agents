/**
 * Self-learning loop — the closed feedback cycle.
 *
 *   1. Resolve the agent's CURRENT prompt (adopted variant, or baseline seed).
 *   2. Run a baseline evaluation batch (real conversations + judge).
 *   3. Generate an improved candidate prompt targeting the measured weaknesses.
 *   4. Run the SAME persona batch against the candidate.
 *   5. Welch's t-test on per-conversation overall scores.
 *   6. Adopt the candidate IFF it is a statistically significant improvement
 *      AND it does not regress compliance below the 98/100 hard gate.
 *
 * Every step is persisted (eval_runs, eval_conversations, learning_variants),
 * and the whole thing runs under a hard cost ceiling.
 */

import { CostTracker, CHEAP_MODEL, SMART_MODEL } from '@/lib/llm'
import { BASELINE_PROMPTS, type AgentName } from '@/lib/agents/prompts'
import {
  runEvaluation,
  weakestRules,
  type RunMetrics,
} from '@/lib/evaluation/evaluation-harness'
import { generatePromptVariant } from '@/lib/learning/prompt-generator'
import { welchTTest } from '@/lib/evaluation/statistics'
import {
  getAdoptedVariant,
  getMaxVariantVersion,
  insertVariant,
  updateVariant,
} from '@/lib/supabase-client'

export const COMPLIANCE_GATE = 98 // out of 100
const SIGNIFICANCE_ALPHA = 0.1 // demo-friendly; small batches have low power

export interface LoopConfig {
  agentName: AgentName
  batchSize?: number
  maxTurns?: number
  costCeilingUsd?: number
  model?: string
  generatorModel?: string
}

export interface LoopResult {
  agentName: string
  baseline: PublicMetrics
  candidate: PublicMetrics
  variantId: string
  improvement: number
  pValue: number
  significant: boolean
  meetsCompliance: boolean
  adopted: boolean
  decision: string
  weakRules: string[]
  newPrompt: string
  cost: ReturnType<CostTracker['summary']['valueOf']> | any
}

export interface PublicMetrics {
  label: string
  runId: string
  numConversations: number
  complianceRate: number
  resolutionRate: number
  avgEfficiency: number
  avgSentiment: number
  avgOverall: number
}

function toPublic(m: RunMetrics): PublicMetrics {
  return {
    label: m.label,
    runId: m.runId,
    numConversations: m.numConversations,
    complianceRate: m.complianceRate,
    resolutionRate: m.resolutionRate,
    avgEfficiency: m.avgEfficiency,
    avgSentiment: m.avgSentiment,
    avgOverall: m.avgOverall,
  }
}

/** Resolve the agent's current prompt: adopted variant if present, else baseline. */
export async function resolveCurrentPrompt(agentName: AgentName): Promise<{
  prompt: string
  parentId: string | null
}> {
  const adopted = await getAdoptedVariant(agentName)
  if (adopted) return { prompt: adopted.prompt_text, parentId: adopted.id }
  return { prompt: BASELINE_PROMPTS[agentName], parentId: null }
}

export async function runSelfLearningLoop(config: LoopConfig): Promise<LoopResult> {
  const agentName = config.agentName
  const batchSize = config.batchSize ?? 4
  const maxTurns = config.maxTurns ?? 4
  const model = config.model ?? CHEAP_MODEL
  const tracker = new CostTracker(config.costCeilingUsd ?? 2.0)

  // 1. current prompt
  const { prompt: currentPrompt, parentId } = await resolveCurrentPrompt(agentName)

  // 2. baseline evaluation
  const baseline = await runEvaluation({
    agentName,
    prompt: currentPrompt,
    label: 'baseline',
    batchSize,
    maxTurns,
    model,
    tracker,
  })

  // 3. generate candidate prompt from measured weaknesses
  const weakRules = weakestRules(baseline.conversations)
  const generated = await generatePromptVariant({
    agentName,
    currentPrompt,
    weaknesses: {
      avgResolutionRate: baseline.resolutionRate,
      avgComplianceScore: baseline.complianceRate,
      avgContextEfficiency: baseline.avgEfficiency,
      weakestRules: weakRules,
    },
    model: config.generatorModel ?? SMART_MODEL,
    tracker,
  })

  // Persist the candidate variant (status: testing)
  const nextVersion = (await getMaxVariantVersion(agentName)) + 1
  const variant = await insertVariant({
    agent_name: agentName,
    version: nextVersion,
    prompt_text: generated.promptText,
    rationale: `Targeted weakest rules: ${weakRules.join('; ') || 'n/a'}`,
    parent_id: parentId,
    baseline_run_id: baseline.runId,
    status: 'testing',
  })

  // 4. candidate evaluation on the SAME persona batch
  const candidate = await runEvaluation({
    agentName,
    prompt: generated.promptText,
    label: `candidate_v${nextVersion}`,
    variantId: variant.id,
    batchSize,
    maxTurns,
    model,
    tracker,
  })

  // 5. significance test on per-conversation overall scores
  const tt = welchTTest(baseline.overallScores, candidate.overallScores)
  const improvement = Number((candidate.avgOverall - baseline.avgOverall).toFixed(4))
  const significant = tt.pValue < SIGNIFICANCE_ALPHA && improvement > 0

  // 6. compliance gate + adoption decision
  const meetsCompliance = candidate.complianceRate >= COMPLIANCE_GATE
  const noComplianceRegression = candidate.complianceRate >= baseline.complianceRate - 0.5
  const adopted = significant && meetsCompliance && noComplianceRegression

  let decision: string
  if (adopted) {
    decision = `Adopted: +${(improvement * 100).toFixed(1)}% overall (p=${tt.pValue.toFixed(3)}), compliance ${candidate.complianceRate.toFixed(1)}/100 meets the ${COMPLIANCE_GATE} gate.`
  } else if (!significant) {
    decision = `Rejected: improvement not statistically significant (Δ=${(improvement * 100).toFixed(1)}%, p=${tt.pValue.toFixed(3)} ≥ ${SIGNIFICANCE_ALPHA}).`
  } else if (!meetsCompliance) {
    decision = `Rejected: compliance ${candidate.complianceRate.toFixed(1)}/100 is below the ${COMPLIANCE_GATE} hard gate.`
  } else {
    decision = `Rejected: candidate regressed compliance vs baseline.`
  }

  await updateVariant(variant.id, {
    variant_run_id: candidate.runId,
    improvement,
    p_value: Number(tt.pValue.toFixed(4)),
    significant,
    meets_compliance: meetsCompliance,
    adopted,
    status: adopted ? 'adopted' : 'rejected',
    adopted_at: adopted ? new Date().toISOString() : null,
  })

  return {
    agentName,
    baseline: toPublic(baseline),
    candidate: toPublic(candidate),
    variantId: variant.id,
    improvement,
    pValue: Number(tt.pValue.toFixed(4)),
    significant,
    meetsCompliance,
    adopted,
    decision,
    weakRules,
    newPrompt: generated.promptText,
    cost: tracker.summary,
  }
}
