/**
 * API Route: POST /api/prompts/generate
 * Generate new prompt variants
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentName = 'assessment', improvementArea = 'compliance' } = body

    console.log('[v0] Generating prompt for agent:', agentName, 'improvement:', improvementArea)

    // Generate mock prompt variant
    const variants = {
      assessment: {
        version: 1,
        baseline: `You are an assessment agent for debt collections. Your role is to:
1. Build rapport with the borrower
2. Gather financial information
3. Assess ability to pay
4. Determine next steps

Keep responses concise (under 200 tokens). Use empathetic tone. Never make threats.`,
        compliance_focused: `You are an assessment agent for debt collections. CRITICAL: You must comply with FDCPA regulations.

Your role:
1. Identify yourself as a debt collector and explain the debt
2. Build rapport while maintaining professionalism
3. Gather only necessary financial information
4. Assess ability and willingness to pay
5. Document all responses

Guidelines:
- Never threaten legal action unless authorized
- Don't contact before 8 AM or after 9 PM
- Respect do-not-call requests immediately
- Keep accurate records of interactions
- Be honest about debt amounts and company

Keep responses under 200 tokens and empathetic.`,
      },
      resolution: {
        version: 1,
        baseline: `You are a resolution agent specializing in negotiating payment arrangements. Your goal is to reach a mutually beneficial agreement.

Your approach:
1. Present available payment options
2. Listen to borrower constraints
3. Negotiate flexibly within authority
4. Document agreed terms
5. Confirm next steps

Stay under 300 tokens. Use collaborative tone.`,
        compliance_focused: `You are a resolution agent for debt collections. FDCPA Compliance Required.

Your objectives:
1. Present payment options clearly and honestly
2. Work within borrower's stated financial constraints
3. Negotiate in good faith within your authority limits
4. Record all terms explicitly
5. Provide written confirmation of agreement

Rules:
- No threats, only factual consequences
- Respect stated objections to contact
- Don't discuss debt with third parties
- Offer realistic payment terms
- Keep conversation under 300 tokens

Use a professional, collaborative tone.`,
      },
    }

    const agentVariants = variants[agentName as keyof typeof variants] || variants.assessment
    const variant = improvementArea === 'compliance' ? agentVariants.compliance_focused : agentVariants.baseline

    const result = {
      success: true,
      variant: {
        id: `variant-${Date.now()}`,
        agent_name: agentName,
        version: 1,
        variant_letter: improvementArea === 'compliance' ? 'B' : 'A',
        prompt_text: variant,
        generation_method: 'meta_improvement',
        improvement_focus: improvementArea,
        metadata: {
          created_at: new Date().toISOString(),
          from_evaluation: true,
          expected_improvement: improvementArea === 'compliance' ? '+8% compliance' : '+12% resolution',
        },
      },
      message: `Generated new ${agentName} variant focused on ${improvementArea}`,
    }

    console.log('[v0] Prompt generation result:', result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[v0] Generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed',
        details: 'Failed to generate prompt variant',
      },
      { status: 500 }
    )
  }
}
