import { NextResponse } from 'next/server'
import { startWorkflow } from '@/lib/orchestrator/durable-orchestrator'
import { BORROWER_PERSONAS } from '@/lib/evaluation/personas'

export const maxDuration = 300

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const personaId: string = body.personaId ?? 'hostile'
    const persona =
      BORROWER_PERSONAS.find((p) => p.id === personaId) ?? BORROWER_PERSONAS[0]

    const result = await startWorkflow({
      persona,
      maxTurnsPerStep: Math.min(Math.max(Number(body.maxTurnsPerStep) || 3, 1), 5),
      costCeilingUsd: Math.min(Number(body.costCeilingUsd) || 0.5, 2),
      // Default to demonstrating durable retry on the resolution step.
      simulateFailureOnStep: body.simulateFailureOnStep ?? 'resolution',
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('[v0] orchestrator/start failed:', err?.message)
    return NextResponse.json(
      { success: false, error: err?.message ?? 'Workflow failed' },
      { status: 500 },
    )
  }
}
