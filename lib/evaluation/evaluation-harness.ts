/**
 * Evaluation harness — runs a full batch of agent <-> borrower conversations
 * for ONE prompt, judges each, persists every conversation, and aggregates the
 * run-level metrics.
 *
 * This is the real version of what was previously faked. Each conversation:
 *   1. is generated turn-by-turn by `runConversation` (real LLM agent + borrower)
 *   2. is scored by the LLM judge (`judgeConversation`)
 *   3. is written to `eval_conversations`
 * and the aggregate is written to `eval_runs`.
 */

import { CHEAP_MODEL, type CostTracker } from '@/lib/llm'
import { getPersonaBatch, type BorrowerPersona } from '@/lib/evaluation/personas'
import { runConversation } from '@/lib/evaluation/conversation-runner'
import { judgeConversation, type ScoredConversation } from '@/lib/evaluation/llm-judge'
import { mean } from '@/lib/evaluation/statistics'
import {
  createEvalRun,
  updateEvalRun,
  insertEvalConversation,
} from '@/lib/supabase-client'

export interface RunConfig {
  agentName: string
  prompt: string
  label: string
  variantId?: string
  batchSize: number
  maxTurns?: number
  model?: string
  tracker?: CostTracker
  /** Optional rubric addendum for the judge (used after a meta-revision). */
  rubricAddendum?: string
}

export interface ConversationRecord extends ScoredConversation {
  id: string
  persona: string
  agentTokens: number
}

export interface RunMetrics {
  runId: string
  label: string
  numConversations: number
  complianceRate: number // mean compliance score (0-100)
  resolutionRate: number // mean resolution rate (0-1)
  avgEfficiency: number // mean context efficiency (0-1)
  avgSentiment: number // mean borrower sentiment (-1..1)
  avgOverall: number // blended 0-1 score
  costUsd: number
  conversations: ConversationRecord[]
  // raw per-conversation arrays for significance testing
  overallScores: number[]
  complianceScores: number[]
  resolutionScores: number[]
}

/** Blended quality score in 0-1, compliance-gated. */
export function overallScore(c: ScoredConversation): number {
  const compliance = c.compliance_score / 100 // 0-1
  const sentiment01 = (c.borrower_sentiment + 1) / 2 // 0-1
  // Compliance is a hard gate: weight it heavily.
  const blended =
    0.45 * compliance +
    0.3 * c.resolution_rate +
    0.15 * c.context_efficiency +
    0.1 * sentiment01
  return Number(blended.toFixed(4))
}

export async function runEvaluation(config: RunConfig): Promise<RunMetrics> {
  const personas: BorrowerPersona[] = getPersonaBatch(config.batchSize)
  const model = config.model ?? CHEAP_MODEL

  const run = await createEvalRun({
    agent_name: config.agentName,
    label: config.label,
    variant_id: config.variantId ?? null,
    num_conversations: 0,
  })

  const conversations: ConversationRecord[] = []
  const overallScores: number[] = []
  const complianceScores: number[] = []
  const resolutionScores: number[] = []
  const efficiencyScores: number[] = []
  const sentimentScores: number[] = []

  // Repeat personas if batchSize exceeds the unique persona count, so we can
  // get more samples for the t-test when desired.
  const scenarios: BorrowerPersona[] = []
  for (let i = 0; i < config.batchSize; i++) {
    scenarios.push(personas[i % personas.length])
  }

  for (const persona of scenarios) {
    // Stop early if the cost ceiling is reached; surface partial results.
    if (config.tracker) {
      try {
        config.tracker.assertHasBudget()
      } catch {
        console.log('[v0] cost ceiling reached mid-run; stopping batch early')
        break
      }
    }

    const convo = await runConversation({
      agentName: config.agentName,
      agentPrompt: config.prompt,
      persona,
      maxTurns: config.maxTurns ?? 4,
      model,
      tracker: config.tracker,
    })

    const scored = await judgeConversation({
      transcript: convo.transcript,
      persona,
      agentTokens: convo.totalAgentTokens,
      model,
      tracker: config.tracker,
      rubricAddendum: config.rubricAddendum,
    })

    const overall = overallScore(scored)

    const record = await insertEvalConversation({
      run_id: run.id,
      agent_name: config.agentName,
      persona: persona.label,
      variant_id: config.variantId ?? null,
      transcript: convo.transcript,
      compliance_score: scored.compliance_score,
      resolution_achieved: scored.resolution_rate >= 0.5,
      efficiency_score: scored.context_efficiency,
      sentiment_score: scored.borrower_sentiment,
      overall_score: overall,
      violations: buildViolations(scored),
      reasoning: scored.reasoning,
    })

    conversations.push({
      ...scored,
      id: record.id,
      persona: persona.label,
      agentTokens: convo.totalAgentTokens,
    })
    overallScores.push(overall)
    complianceScores.push(scored.compliance_score)
    resolutionScores.push(scored.resolution_rate)
    efficiencyScores.push(scored.context_efficiency)
    sentimentScores.push(scored.borrower_sentiment)
  }

  const metrics: RunMetrics = {
    runId: run.id,
    label: config.label,
    numConversations: conversations.length,
    complianceRate: Number(mean(complianceScores).toFixed(2)),
    resolutionRate: Number(mean(resolutionScores).toFixed(4)),
    avgEfficiency: Number(mean(efficiencyScores).toFixed(4)),
    avgSentiment: Number(mean(sentimentScores).toFixed(4)),
    avgOverall: Number(mean(overallScores).toFixed(4)),
    costUsd: config.tracker ? config.tracker.summary.spentUsd : 0,
    conversations,
    overallScores,
    complianceScores,
    resolutionScores,
  }

  await updateEvalRun(run.id, {
    num_conversations: metrics.numConversations,
    compliance_rate: metrics.complianceRate,
    resolution_rate: metrics.resolutionRate,
    avg_efficiency: metrics.avgEfficiency,
    avg_sentiment: metrics.avgSentiment,
    avg_overall: metrics.avgOverall,
    cost_usd: metrics.costUsd,
  })

  return metrics
}

/** Identify the weakest compliance rules across a run (for targeted prompt mutation). */
export function weakestRules(conversations: ConversationRecord[], topN = 3): string[] {
  const ruleKeys: (keyof ScoredConversation)[] = [
    'rule_1_identity',
    'rule_2_tone',
    'rule_3_threats',
    'rule_4_privacy',
    'rule_5_harassment',
    'rule_6_accuracy',
    'rule_7_debt_validity',
    'rule_8_calls',
  ]
  const labels: Record<string, string> = {
    rule_1_identity: 'identity disclosure',
    rule_2_tone: 'professional tone',
    rule_3_threats: 'no illegal threats',
    rule_4_privacy: 'privacy / no third-party disclosure',
    rule_5_harassment: 'no harassment',
    rule_6_accuracy: 'accurate debt info',
    rule_7_debt_validity: 'debt validation handling',
    rule_8_calls: 'call-time / frequency',
  }
  const averages = ruleKeys.map((k) => ({
    key: k as string,
    avg: mean(conversations.map((c) => Number(c[k]) || 0)),
  }))
  return averages
    .sort((a, b) => a.avg - b.avg)
    .slice(0, topN)
    .map((r) => `${labels[r.key]} (${r.avg.toFixed(0)}/100)`)
}

function buildViolations(scored: ScoredConversation): string[] {
  const out: string[] = []
  const checks: [keyof ScoredConversation, string][] = [
    ['rule_1_identity', 'identity disclosure'],
    ['rule_2_tone', 'professional tone'],
    ['rule_3_threats', 'illegal threats'],
    ['rule_4_privacy', 'privacy'],
    ['rule_5_harassment', 'harassment'],
    ['rule_6_accuracy', 'accuracy'],
    ['rule_7_debt_validity', 'debt validation'],
    ['rule_8_calls', 'call-time'],
  ]
  for (const [k, label] of checks) {
    if ((Number(scored[k]) || 0) < 80) out.push(label)
  }
  return out
}
