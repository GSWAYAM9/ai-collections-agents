/**
 * API Route: POST /api/cases/run
 * Starts the durable collections workflow for a real case.
 *
 * Bridges a stored case + borrower into a BorrowerPersona and runs it through
 * the durable, resumable orchestrator (lib/orchestrator/durable-orchestrator).
 */

import { NextRequest, NextResponse } from 'next/server'
import { startWorkflow } from '@/lib/orchestrator/durable-orchestrator'
import type { BorrowerPersona } from '@/lib/evaluation/personas'
import { getCaseWithBorrower } from '@/lib/supabase-client'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const { caseId } = await req.json()

    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
    }

    const caseData = await getCaseWithBorrower(caseId)
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const borrower = caseData.borrowers ?? {}
    const debtAmountCents = Math.round(
      Number(caseData.debt_amount ?? borrower.debt_amount ?? 2500) * 100,
    )
    const debtAgeDays = Number(caseData.debt_age_days ?? caseData.age_days ?? 90)

    const persona: BorrowerPersona = {
      id: caseId,
      label: borrower.name ? `Borrower: ${borrower.name}` : 'Live case borrower',
      behavior:
        'You are a real borrower contacted about an outstanding balance. Respond naturally and realistically: ask reasonable questions, and agree to a sensible payment plan only if the agent is professional, compliant, and respectful.',
      resolvable: true,
      debtAmountCents: Number.isFinite(debtAmountCents) ? debtAmountCents : 250000,
      debtAgeDays: Number.isFinite(debtAgeDays) ? debtAgeDays : 90,
    }

    const result = await startWorkflow({
      persona,
      maxTurnsPerStep: 3,
      costCeilingUsd: 1,
      // Real cases run without an injected failure.
      simulateFailureOnStep: undefined,
    })

    return NextResponse.json({
      success: true,
      caseId,
      workflowId: result.workflowId,
      outcome: result.state.outcome,
      steps: result.state.completedSteps.map((s) => ({
        step: s.step,
        attempts: s.attempts,
        compliance: s.compliance,
        resolutionAchieved: s.resolutionAchieved,
        variantVersion: s.variantVersion,
      })),
      events: result.events.length,
    })
  } catch (error) {
    console.error('[v0] /api/cases/run error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
