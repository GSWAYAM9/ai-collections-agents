/**
 * POST /api/learning/run
 * Runs one full self-learning iteration for an agent:
 * baseline -> generate candidate -> test -> t-test -> compliance gate -> adopt.
 *
 * Body: { agentName?, batchSize?, maxTurns?, costCeilingUsd? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { runSelfLearningLoop } from '@/lib/learning/self-learning-loop'
import { BASELINE_PROMPTS, type AgentName } from '@/lib/agents/prompts'

export const maxDuration = 600

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const agentName = (body.agentName ?? 'assessment') as AgentName
    const batchSize = Math.min(Math.max(parseInt(body.batchSize ?? 4, 10), 2), 10)
    const maxTurns = Math.min(Math.max(parseInt(body.maxTurns ?? 4, 10), 2), 6)
    const costCeilingUsd = Number(body.costCeilingUsd ?? 3.0)

    if (!BASELINE_PROMPTS[agentName]) {
      return NextResponse.json({ success: false, error: `Unknown agent: ${agentName}` }, { status: 400 })
    }

    console.log('[v0] Running self-learning loop for', agentName)

    const result = await runSelfLearningLoop({ agentName, batchSize, maxTurns, costCeilingUsd })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('[v0] Learning loop error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Learning loop failed' },
      { status: 500 },
    )
  }
}
