/**
 * POST /api/prompts/generate
 * Generates a single improved prompt variant for an agent using the REAL
 * generator (driven by the agent's current prompt). This does NOT run a full
 * evaluation — use /api/learning/run for the full test-and-adopt cycle. The
 * generated variant is persisted with status 'generated'.
 *
 * Body: { agentName?, costCeilingUsd? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { CostTracker, SMART_MODEL } from '@/lib/llm'
import { BASELINE_PROMPTS, type AgentName } from '@/lib/agents/prompts'
import { resolveCurrentPrompt } from '@/lib/learning/self-learning-loop'
import { generatePromptVariant } from '@/lib/learning/prompt-generator'
import { getMaxVariantVersion, insertVariant } from '@/lib/supabase-client'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const agentName = (body.agentName ?? 'assessment') as AgentName
    if (!BASELINE_PROMPTS[agentName]) {
      return NextResponse.json({ success: false, error: `Unknown agent: ${agentName}` }, { status: 400 })
    }

    const tracker = new CostTracker(Number(body.costCeilingUsd ?? 0.5))
    const { prompt: currentPrompt, parentId } = await resolveCurrentPrompt(agentName)

    // Without a fresh eval we pass conservative placeholder weaknesses; the
    // full loop (/api/learning/run) supplies measured weaknesses instead.
    const generated = await generatePromptVariant({
      agentName,
      currentPrompt,
      weaknesses: {
        avgResolutionRate: Number(body.resolutionRate ?? 0.6),
        avgComplianceScore: Number(body.complianceScore ?? 95),
        avgContextEfficiency: Number(body.contextEfficiency ?? 0.6),
        weakestRules: Array.isArray(body.weakestRules) ? body.weakestRules : [],
      },
      model: SMART_MODEL,
      tracker,
    })

    const nextVersion = (await getMaxVariantVersion(agentName)) + 1
    const variant = await insertVariant({
      agent_name: agentName,
      version: nextVersion,
      prompt_text: generated.promptText,
      rationale: 'Generated on demand (no evaluation attached)',
      parent_id: parentId,
      status: 'generated',
    })

    return NextResponse.json({
      success: true,
      variant: {
        id: variant.id,
        agent_name: agentName,
        version: nextVersion,
        prompt_text: generated.promptText,
        status: 'generated',
      },
      cost: tracker.summary,
    })
  } catch (error) {
    console.error('[v0] Generation error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 },
    )
  }
}
