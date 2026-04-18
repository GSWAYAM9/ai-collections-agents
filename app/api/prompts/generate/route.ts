/**
 * API Route: POST /api/prompts/generate
 * Generate new prompt variants
 */

import { NextRequest, NextResponse } from 'next/server'
import { PromptGenerator } from '@/lib/learning/prompt-generator'

export async function POST(req: NextRequest) {
  try {
    const { agentName, version, improvementArea } = await req.json()

    if (!agentName || !version || !improvementArea) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get parent/baseline variant
    const { data: variants, error } = await (await import('@/lib/supabase-client')).supabaseAdmin
      .from('prompt_variants')
      .select('*')
      .eq('agent_name', agentName)
      .eq('version', version - 1)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    const parentVariant = variants?.[0]
    if (!parentVariant) {
      return NextResponse.json(
        { error: 'Parent variant not found' },
        { status: 404 }
      )
    }

    // Generate new variant
    const generator = new PromptGenerator()
    const newVariant = await generator.generateVariant({
      agentName,
      version,
      parentVariant: parentVariant.prompt_text,
      improvementArea,
    })

    return NextResponse.json({
      success: true,
      variant: newVariant,
    })
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Generation failed',
      },
      { status: 500 }
    )
  }
}
