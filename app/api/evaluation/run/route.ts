/**
 * API Route: GET /api/evaluation/run
 * Runs evaluation harness
 */

import { NextRequest, NextResponse } from 'next/server'
import { EvaluationHarness } from '@/lib/evaluation/evaluation-harness'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const batchSize = parseInt(searchParams.get('batchSize') || '10', 10)
    const seed = parseInt(searchParams.get('seed') || '42', 10)

    // Run evaluation
    const harness = new EvaluationHarness({
      batchSize,
      variants: ['baseline'],
      seed,
    })

    const result = await harness.runEvaluation()
    const totalCost = harness.getTotalCost()

    return NextResponse.json({
      success: true,
      evaluation: result,
      totalCost,
    })
  } catch (error) {
    console.error('Evaluation error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Evaluation failed',
      },
      { status: 500 }
    )
  }
}
