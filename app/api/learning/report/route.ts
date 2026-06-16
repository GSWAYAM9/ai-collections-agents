/**
 * GET /api/learning/report
 * Returns the evolution report data: recent eval runs, prompt variants and
 * their adoption decisions, and meta-evaluation revisions. Powers the
 * Learning Lab UI and the reproducibility/evolution export.
 */

import { NextResponse } from 'next/server'
import {
  getRecentEvalRuns,
  getVariants,
  getMetaRevisions,
} from '@/lib/supabase-client'

export async function GET() {
  try {
    const [runs, variants, revisions] = await Promise.all([
      getRecentEvalRuns(30),
      getVariants(undefined, 50),
      getMetaRevisions(20),
    ])

    const adopted = variants.filter((v: any) => v.adopted)
    const totalCost = runs.reduce((s: number, r: any) => s + (Number(r.cost_usd) || 0), 0)

    return NextResponse.json({
      success: true,
      summary: {
        totalRuns: runs.length,
        totalVariants: variants.length,
        adoptedVariants: adopted.length,
        metaRevisions: revisions.length,
        adoptedMetaRevisions: revisions.filter((r: any) => r.adopted).length,
        totalCostUsd: Number(totalCost.toFixed(4)),
      },
      runs,
      variants,
      revisions,
    })
  } catch (error) {
    console.error('[v0] Report error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Report failed' },
      { status: 500 },
    )
  }
}
