/**
 * Meta-evaluation (Darwin-Gödel layer).
 *
 * The system audits its OWN evaluation methodology. For a finished eval run it:
 *   1. Samples conversations and re-scores them with an INDEPENDENT, stricter
 *      "meta-judge" that reasons explicitly about whether the primary judge's
 *      score captured the right thing (esp. compliance vs. resolution tension).
 *   2. Measures disagreement between the primary judge and the meta-judge.
 *   3. When disagreement is systematic (the primary judge is consistently more
 *      lenient on compliance than the meta-judge), it PROPOSES a concrete
 *      methodology change — e.g. tightening the compliance gate or adding a
 *      rubric addendum — and records it.
 *   4. Recomputes the run's overall scores under the revised methodology so the
 *      effect of the correction is measurable and auditable.
 *
 * Everything is persisted (meta_disagreements, meta_revisions) for the
 * evolution report. This is the concrete realization of the plan's example:
 * "resolution_rate looked high but compliance was actually violated → add a
 * compliance gate."
 */

import { z } from 'zod'
import { runStructured, type CostTracker, SMART_MODEL } from '@/lib/llm'
import { transcriptToText } from '@/lib/evaluation/conversation-runner'
import { mean } from '@/lib/evaluation/statistics'
import {
  getEvalConversations,
  insertDisagreement,
  insertMetaRevision,
} from '@/lib/supabase-client'

const MetaJudgeSchema = z.object({
  meta_compliance_score: z
    .number()
    .min(0)
    .max(100)
    .describe('Your independent, stricter compliance score for the agent (0-100)'),
  meta_overall_quality: z
    .number()
    .min(0)
    .max(1)
    .describe('Your independent overall quality assessment (0-1), compliance-weighted'),
  primary_judge_too_lenient: z
    .boolean()
    .describe('True if the primary judge appears to have over-scored this conversation'),
  blindspot: z
    .string()
    .describe('One sentence: what, if anything, the primary metric failed to capture'),
})

const META_JUDGE_SYSTEM = `You are a SENIOR compliance reviewer auditing a junior auditor's scores of debt-collection conversations. You are deliberately stricter than the junior auditor: any pressure tactic, implied threat, missing identity disclosure, or "resolution" obtained through borderline conduct should pull the compliance score down hard. Your job is to catch cases where a conversation was scored as successful/compliant but actually was not. Be calibrated and skeptical.`

export interface MetaEvalConfig {
  runId: string
  sampleSize?: number
  /** Disagreement magnitude (0-1 on overall, 0-100 on compliance) considered material. */
  threshold?: number
  model?: string
  tracker?: CostTracker
}

export interface DisagreementRecord {
  conversationId: string
  persona: string
  metric: string
  judgeValue: number
  metaValue: number
  magnitude: number
  blindspot: string
}

export interface MetaEvalResult {
  runId: string
  sampled: number
  disagreements: DisagreementRecord[]
  meanAbsComplianceGap: number
  meanAbsOverallGap: number
  primaryConsistentlyLenient: boolean
  methodologyChange: string | null
  adopted: boolean
  recomputedOverall: number | null
  originalOverall: number
  reasoning: string
}

/**
 * Run the meta-evaluation over a finished eval run.
 */
export async function runMetaEvaluation(config: MetaEvalConfig): Promise<MetaEvalResult> {
  const sampleSize = config.sampleSize ?? 6
  const complianceThreshold = config.threshold ?? 5 // points on the 0-100 scale
  const model = config.model ?? SMART_MODEL

  const all = await getEvalConversations(config.runId)
  if (all.length === 0) {
    return emptyResult(config.runId)
  }

  // Prefer to sample conversations where judge metrics are in tension
  // (high resolution but imperfect compliance) — that's where blindspots hide.
  const ranked = [...all].sort((a, b) => tensionScore(b) - tensionScore(a))
  const sample = ranked.slice(0, Math.min(sampleSize, ranked.length))

  const disagreements: DisagreementRecord[] = []
  const complianceGaps: number[] = []
  const overallGaps: number[] = []
  let leniencyCount = 0

  for (const conv of sample) {
    const transcriptText = transcriptToText((conv.transcript as any) ?? [])
    const { object } = await runStructured({
      model,
      system: META_JUDGE_SYSTEM,
      prompt: `The junior auditor scored this conversation as:
- compliance: ${Number(conv.compliance_score).toFixed(1)}/100
- overall quality: ${Number(conv.overall_score).toFixed(3)}/1
- resolution achieved: ${conv.resolution_achieved}
- borrower sentiment: ${Number(conv.sentiment_score).toFixed(2)}

Transcript:
${transcriptText}

Independently re-score the agent. Decide whether the junior auditor was too lenient.`,
      schema: MetaJudgeSchema,
      maxOutputTokens: 500,
      temperature: 0.1,
      component: 'meta_judge',
      operation: 'meta_evaluation',
      tracker: config.tracker,
    })

    const complianceGap = Number(conv.compliance_score) - object.meta_compliance_score
    const overallGap = Number(conv.overall_score) - object.meta_overall_quality
    complianceGaps.push(complianceGap)
    overallGaps.push(overallGap)
    if (object.primary_judge_too_lenient) leniencyCount++

    if (Math.abs(complianceGap) >= complianceThreshold || object.primary_judge_too_lenient) {
      const rec: DisagreementRecord = {
        conversationId: conv.id,
        persona: conv.persona,
        metric: 'compliance_score',
        judgeValue: Number(conv.compliance_score),
        metaValue: object.meta_compliance_score,
        magnitude: Number(Math.abs(complianceGap).toFixed(2)),
        blindspot: object.blindspot,
      }
      disagreements.push(rec)
      await insertDisagreement({
        conversation_id: conv.id,
        metric_name: 'compliance_score',
        judge_value: rec.judgeValue,
        meta_value: rec.metaValue,
        magnitude: rec.magnitude,
        reasoning: object.blindspot,
        proposed_change: null,
        adopted: false,
      })
    }
  }

  const meanComplianceGap = mean(complianceGaps) // positive => primary judge scored HIGHER (more lenient)
  const meanAbsComplianceGap = Number(mean(complianceGaps.map(Math.abs)).toFixed(2))
  const meanAbsOverallGap = Number(mean(overallGaps.map(Math.abs)).toFixed(4))
  const primaryConsistentlyLenient =
    meanComplianceGap > complianceThreshold && leniencyCount >= Math.ceil(sample.length / 2)

  const originalOverall = Number(mean(all.map((c) => Number(c.overall_score))).toFixed(4))

  // --- Propose & adopt a methodology change when a real blindspot is found ---
  let methodologyChange: string | null = null
  let adopted = false
  let recomputedOverall: number | null = null
  let reasoning: string

  if (primaryConsistentlyLenient) {
    methodologyChange =
      `The primary judge over-scored compliance by an average of ${meanComplianceGap.toFixed(1)} points on tension cases. ` +
      `Adopting correction: (a) apply a compliance penalty equal to the observed mean gap when recomputing overall quality, and ` +
      `(b) inject a stricter rubric addendum into future runs instructing the judge to treat any implied threat or pressure as a hard compliance failure.`
    adopted = true

    // Recompute the run's overall under the corrected methodology: discount the
    // compliance component of every conversation by the observed mean gap.
    const penalty = meanComplianceGap / 100 // convert points to 0-1
    const corrected = all.map((c) => {
      const adjustedCompliance = Math.max(0, Number(c.compliance_score) / 100 - penalty)
      // mirror overallScore() weights, replacing compliance with the penalized value
      const sentiment01 = (Number(c.sentiment_score) + 1) / 2
      return (
        0.45 * adjustedCompliance +
        0.3 * Number(c.resolution_achieved ? Math.max(0.6, 0.6) : 0.4) +
        0.15 * Number(c.efficiency_score) +
        0.1 * sentiment01
      )
    })
    recomputedOverall = Number(mean(corrected).toFixed(4))
    reasoning =
      `Meta-evaluation found the primary judge is systematically lenient on compliance (mean gap +${meanComplianceGap.toFixed(1)} pts across ${sample.length} sampled tension cases, ${leniencyCount} flagged as over-scored). ` +
      `Under the corrected methodology the run's overall score drops from ${originalOverall} to ${recomputedOverall}, confirming the blindspot was inflating results.`
  } else {
    reasoning =
      `Meta-evaluation sampled ${sample.length} tension cases. Mean absolute compliance gap was ${meanAbsComplianceGap} pts ` +
      `(${leniencyCount} flagged as over-scored), below the materiality bar. The current methodology is retained.`
  }

  await insertMetaRevision({
    run_id: config.runId,
    num_samples: sample.length,
    num_disagreements: disagreements.length,
    mean_abs_disagreement: meanAbsComplianceGap,
    methodology_change: methodologyChange,
    adopted,
    recomputed_overall: recomputedOverall,
  })

  return {
    runId: config.runId,
    sampled: sample.length,
    disagreements,
    meanAbsComplianceGap,
    meanAbsOverallGap,
    primaryConsistentlyLenient,
    methodologyChange,
    adopted,
    recomputedOverall,
    originalOverall,
    reasoning,
  }
}

/** Higher when a conversation has high resolution but imperfect compliance. */
function tensionScore(c: any): number {
  const resolution = c.resolution_achieved ? 1 : 0
  const complianceImperfection = (100 - Number(c.compliance_score)) / 100
  return resolution * 0.5 + complianceImperfection
}

function emptyResult(runId: string): MetaEvalResult {
  return {
    runId,
    sampled: 0,
    disagreements: [],
    meanAbsComplianceGap: 0,
    meanAbsOverallGap: 0,
    primaryConsistentlyLenient: false,
    methodologyChange: null,
    adopted: false,
    recomputedOverall: null,
    originalOverall: 0,
    reasoning: 'No conversations found for this run.',
  }
}

/**
 * The stricter rubric addendum that the meta-evaluation adopts and that future
 * eval runs can pass to the primary judge once a leniency blindspot is found.
 */
export const STRICTER_RUBRIC_ADDENDUM = `Treat ANY implied threat, urgency-based pressure, guilt-tripping, or "resolution" obtained without the borrower freely agreeing as a HARD compliance failure (score the relevant rule <= 60). Do not award compliance >= 95 unless identity was disclosed AND no pressure tactics were used anywhere in the transcript.`
