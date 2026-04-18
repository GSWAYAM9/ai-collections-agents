/**
 * Prompt Generation & Variant Testing
 * Generates new prompt variants and tests them
 */

import { Anthropic } from '@anthropic-ai/sdk'
import { v4 as uuidv4 } from 'uuid'
import { supabaseAdmin, logCost } from '@/lib/supabase-client'

export interface PromptVariant {
  id: string
  agent_name: 'assessment' | 'resolution' | 'final_notice'
  version: number
  variant_letter: string
  prompt_text: string
  parent_variant_id?: string
}

export interface GenerationOptions {
  agentName: 'assessment' | 'resolution' | 'final_notice'
  version: number
  parentVariant: string
  improvementArea: string // e.g., "increase_resolution_rate", "improve_compliance"
}

export class PromptGenerator {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }

  /**
   * Generate new prompt variant
   */
  async generateVariant(options: GenerationOptions): Promise<PromptVariant> {
    const { agentName, version, parentVariant, improvementArea } = options

    // Create generation prompt
    const generationPrompt = `You are an expert at optimizing debt collection agent prompts.

Current agent: ${agentName}
Current version: ${version}
Goal: Improve on "${improvementArea}"

Current prompt:
${parentVariant}

Generate an improved version of this prompt that:
1. Keeps all compliance rules intact
2. Better addresses "${improvementArea}"
3. Is clearer and more actionable
4. Maintains professional tone
5. Stays under 500 tokens

Output ONLY the new prompt text, no explanation.`

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: generationPrompt,
        },
      ],
    })

    const newPromptText = (response.content[0] as any).text

    // Log cost
    await logCost({
      component: 'prompt_generation',
      provider: 'anthropic',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cost_usd:
        (response.usage.input_tokens * 0.003 +
          response.usage.output_tokens * 0.015) /
        1000,
      operation: 'prompt_generation',
      metadata: { agent: agentName, improvement: improvementArea },
    })

    // Get next variant letter
    const variantLetter = this.getNextVariantLetter(version)

    // Store in database
    const { data: newVariant, error } = await supabaseAdmin
      .from('prompt_variants')
      .insert([
        {
          agent_name: agentName,
          version,
          variant_letter: variantLetter,
          prompt_text: newPromptText,
          generation_method: 'llm_generated',
          parent_variant_id: null,
        },
      ])
      .select()

    if (error) throw error

    return newVariant[0]
  }

  /**
   * Get next variant letter (A, B, C, etc.)
   */
  private getNextVariantLetter(version: number): string {
    // Assuming versions increment, letters cycle through alphabet
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    return letters[version % letters.length]
  }

  /**
   * Compare two prompt variants
   */
  async compareVariants(
    variantA: PromptVariant,
    variantB: PromptVariant,
    evaluationResults: {
      variantA_metrics: any
      variantB_metrics: any
    }
  ): Promise<{ winner: string; reason: string; confidence: number }> {
    const { variantA_metrics, variantB_metrics } = evaluationResults

    // Calculate improvement
    const resolutionImprovement =
      (variantB_metrics.avg_resolution_rate -
        variantA_metrics.avg_resolution_rate) /
      variantA_metrics.avg_resolution_rate

    const complianceImprovement =
      (variantB_metrics.avg_compliance_score -
        variantA_metrics.avg_compliance_score) /
      variantA_metrics.avg_compliance_score

    // Variant B is better if both metrics improved (or compliance improved significantly)
    const complianceIsHigher = variantB_metrics.avg_compliance_score > 98 // Compliance threshold
    const resolutionIsHigher =
      variantB_metrics.avg_resolution_rate > variantA_metrics.avg_resolution_rate
    const efficiencyIsHigher =
      variantB_metrics.avg_context_efficiency >
      variantA_metrics.avg_context_efficiency

    const isSignificantImprovement =
      resolutionImprovement > 0.05 || complianceImprovement > 0.02

    const winner =
      complianceIsHigher && (resolutionIsHigher || efficiencyIsHigher)
        ? 'B'
        : 'A'

    return {
      winner: `Variant ${winner}`,
      reason:
        winner === 'B'
          ? `${resolutionImprovement > 0 ? `+${(resolutionImprovement * 100).toFixed(1)}% resolution, ` : ''}+${(complianceImprovement * 100).toFixed(1)}% compliance`
          : 'Variant A maintains better compliance/resolution balance',
      confidence: Math.abs(complianceImprovement) > 0.1 ? 0.95 : 0.7,
    }
  }
}

/**
 * Variant Testing Manager
 */
export class VariantTester {
  /**
   * Test a variant against baseline
   */
  async testVariant(
    variantId: string,
    evaluationRunId: string,
    baselineMetrics: any
  ): Promise<{ significant: boolean; improvement: number; newMetrics: any }> {
    // Fetch variant test results
    const { data: testResults, error } = await supabaseAdmin
      .from('variant_test_results')
      .select('*')
      .eq('variant_id', variantId)
      .eq('evaluation_run_id', evaluationRunId)

    if (error) throw error

    const result = testResults?.[0]

    if (!result) {
      return {
        significant: false,
        improvement: 0,
        newMetrics: {},
      }
    }

    // Calculate improvement over baseline
    const resolutionImprovement =
      result.improvement_over_baseline || 0

    const isSignificant =
      resolutionImprovement > 0.05 &&
      result.meets_compliance_threshold &&
      result.statistical_significance < 0.05 // p < 0.05

    return {
      significant: isSignificant,
      improvement: resolutionImprovement,
      newMetrics: {
        avg_resolution_rate: result.avg_resolution_rate,
        avg_compliance_score: result.avg_compliance_score,
        avg_context_efficiency: result.avg_context_efficiency,
      },
    }
  }

  /**
   * Adopt winning variant as new baseline
   */
  async adoptVariant(variantId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('prompt_variants')
      .update({ adopted_at: new Date().toISOString() })
      .eq('id', variantId)

    if (error) throw error
  }
}
