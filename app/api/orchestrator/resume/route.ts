import { NextResponse } from 'next/server'
import { resumeWorkflow } from '@/lib/orchestrator/durable-orchestrator'

export const maxDuration = 300

export async function POST(req: Request) {
  try {
    const { workflowId } = await req.json()
    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: 'workflowId is required' },
        { status: 400 },
      )
    }
    const result = await resumeWorkflow(workflowId)
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('[v0] orchestrator/resume failed:', err?.message)
    return NextResponse.json(
      { success: false, error: err?.message ?? 'Resume failed' },
      { status: 500 },
    )
  }
}
