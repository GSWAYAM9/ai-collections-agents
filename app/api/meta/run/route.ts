/**
 * POST /api/meta/run
 * Runs the Darwin-Gödel meta-evaluation over a finished eval run: an
 * independent stricter judge re-scores sampled conversations, disagreements are
 * detected, and a methodology correction is proposed/adopted when the primary
 * judge is systematically lenient.
 *
 * Body: { runId, sampleSize?, costCeilingUsd? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { CostTracker, SMART_MODEL } from '@/lib/llm'
import { runMetaEvaluation } from '@/lib/learning/meta-evaluator'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const runId = body.runId as string
    if (!runId) {
      return NextResponse.json({ success: false, error: 'runId is required' }, { status: 400 })
    }
    const sampleSize = Math.min(Math.max(parseInt(body.sampleSize ?? 6, 10), 1), 12)
    const tracker = new CostTracker(Number(body.costCeilingUsd ?? 1.5))

    console.log('[v0] Running meta-evaluation for run', runId)

    const result = await runMetaEvaluation({ runId, sampleSize, model: SMART_MODEL, tracker })

    return NextResponse.json({ success: true, result, cost: tracker.summary })
  } catch (error) {
    console.error('[v0] Meta-evaluation error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Meta-evaluation failed' },
      { status: 500 },
    )
  }
}
