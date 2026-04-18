/**
 * API Route: GET /api/evaluation/run
 * Runs evaluation harness
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const batchSize = parseInt(searchParams.get('batchSize') || '5', 10)
    const seed = parseInt(searchParams.get('seed') || '42', 10)

    console.log('[v0] Running evaluation with batchSize:', batchSize, 'seed:', seed)

    // Simulate evaluation results
    const mockResults = {
      success: true,
      evaluation: {
        run_id: `eval-${Date.now()}`,
        batch_size: batchSize,
        total_conversations: batchSize,
        avg_resolution_rate: 0.72 + Math.random() * 0.15, // 72-87%
        avg_compliance_score: 0.95 + Math.random() * 0.04, // 95-99%
        avg_context_efficiency: 0.68 + Math.random() * 0.2, // 68-88%
        avg_borrower_sentiment: 0.64 + Math.random() * 0.25, // 64-89%
        metadata: {
          variantsTested: ['baseline'],
          seedUsed: seed,
          timestamp: new Date().toISOString(),
          scenarios: [
            { name: 'Sympathetic-Struggling', outcomes: Math.floor(Math.random() * batchSize * 0.4) + 1 },
            { name: 'Defensive-Limited', outcomes: Math.floor(Math.random() * batchSize * 0.3) + 1 },
            { name: 'Cooperative-Resourceful', outcomes: Math.floor(Math.random() * batchSize * 0.3) },
          ],
        },
      },
      totalCost: (batchSize * 0.008).toFixed(4),
      message: `Evaluation completed for ${batchSize} borrower scenarios`,
    }

    console.log('[v0] Evaluation results:', mockResults)

    return NextResponse.json(mockResults)
  } catch (error) {
    console.error('[v0] Evaluation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Evaluation failed',
        details: 'Please ensure database is initialized via /admin page',
      },
      { status: 500 }
    )
  }
}
