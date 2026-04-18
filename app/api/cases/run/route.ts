/**
 * API Route: POST /api/cases/run
 * Starts a collections pipeline for a case
 */

import { NextRequest, NextResponse } from 'next/server'
import { collectionsWorkflow } from '@/lib/workflow/collections-workflow'
import { supabaseAdmin, getCaseWithBorrower } from '@/lib/supabase-client'

export async function POST(req: NextRequest) {
  try {
    const { caseId } = await req.json()

    if (!caseId) {
      return NextResponse.json(
        { error: 'caseId is required' },
        { status: 400 }
      )
    }

    // Verify case exists
    const caseData = await getCaseWithBorrower(caseId)
    if (!caseData) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    // Run workflow
    const result = await collectionsWorkflow({
      caseId,
      borrowerId: caseData.borrower_id,
    })

    return NextResponse.json({
      success: true,
      workflow: result,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
