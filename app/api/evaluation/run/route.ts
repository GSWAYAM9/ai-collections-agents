/**
 * POST /api/evaluation/run
 * Runs a REAL evaluation batch for one agent prompt: live agent <-> borrower
 * conversations, LLM judge scoring, persisted to eval_runs / eval_conversations.
 *
 * Body: { agentName?, batchSize?, maxTurns?, costCeilingUsd? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { CostTracker, CHEAP_MODEL } from '@/lib/llm'
import { BASELINE_PROMPTS, type AgentName } from '@/lib/agents/prompts'
import { resolveCurrentPrompt } from '@/lib/learning/self-learning-loop'
import { runEvaluation, weakestRules } from '@/lib/evaluation/evaluation-harness'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const agentName = (body.agentName ?? 'assessment') as AgentName
    const batchSize = Math.min(Math.max(parseInt(body.batchSize ?? 4, 10), 1), 10)
    const maxTurns = Math.min(Math.max(parseInt(body.maxTurns ?? 4, 10), 2), 6)
    const ceiling = Number(body.costCeilingUsd ?? 1.5)

    if (!BASELINE_PROMPTS[agentName]) {
      return NextResponse.json({ success: false, error: `Unknown agent: ${agentName}` }, { status: 400 })
    }

    console.log('[v0] Running REAL evaluation', { agentName, batchSize, maxTurns })

    const tracker = new CostTracker(ceiling)
    const { prompt } = await resolveCurrentPrompt(agentName)

    const metrics = await runEvaluation({
      agentName,
      prompt,
      label: 'manual_eval',
      batchSize,
      maxTurns,
      model: CHEAP_MODEL,
      tracker,
    })

    return NextResponse.json({
      success: true,
      evaluation: {
        run_id: metrics.runId,
        agent_name: agentName,
        total_conversations: metrics.numConversations,
        avg_resolution_rate: metrics.resolutionRate,
        avg_compliance_score: metrics.complianceRate,
        avg_context_efficiency: metrics.avgEfficiency,
        avg_borrower_sentiment: metrics.avgSentiment,
        avg_overall: metrics.avgOverall,
        weakest_rules: weakestRules(metrics.conversations),
        conversations: metrics.conversations.map((c) => ({
          id: c.id,
          persona: c.persona,
          compliance_score: c.compliance_score,
          resolution_rate: c.resolution_rate,
          context_efficiency: c.context_efficiency,
          borrower_sentiment: c.borrower_sentiment,
          reasoning: c.reasoning,
        })),
      },
      cost: tracker.summary,
      message: `Evaluated ${metrics.numConversations} live conversations for ${agentName}`,
    })
  } catch (error) {
    console.error('[v0] Evaluation error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Evaluation failed' },
      { status: 500 },
    )
  }
}
