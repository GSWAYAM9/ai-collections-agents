/**
 * Prompt generation — produces an improved candidate system prompt for an
 * agent, driven by the REAL measured weaknesses from the baseline evaluation.
 *
 * Routed through the AI Gateway (no raw Anthropic key). The generator is told
 * exactly which metrics underperformed so the mutation is targeted rather than
 * random.
 */

import { runLLM, type CostTracker, SMART_MODEL } from '@/lib/llm'
import type { AgentName } from '@/lib/agents/prompts'

export interface GenerateVariantParams {
  agentName: AgentName
  currentPrompt: string
  /** Aggregate metrics from the baseline run, used to focus the rewrite. */
  weaknesses: {
    avgResolutionRate: number
    avgComplianceScore: number
    avgContextEfficiency: number
    weakestRules: string[]
  }
  model?: string
  tracker?: CostTracker
}

export interface GeneratedVariant {
  promptText: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export async function generatePromptVariant(
  params: GenerateVariantParams,
): Promise<GeneratedVariant> {
  const { agentName, currentPrompt, weaknesses } = params

  const generationPrompt = `You are an expert at optimizing debt-collection agent system prompts for higher resolution rates WITHOUT sacrificing compliance.

Agent role: ${agentName}

Current measured performance of the prompt below:
- Resolution rate: ${(weaknesses.avgResolutionRate * 100).toFixed(1)}%
- Compliance score: ${weaknesses.avgComplianceScore.toFixed(1)}/100 (must reach >= 98)
- Context efficiency: ${(weaknesses.avgContextEfficiency * 100).toFixed(1)}%
- Weakest compliance rules: ${weaknesses.weakestRules.join(', ') || 'none flagged'}

Current prompt:
"""
${currentPrompt}
"""

Produce an improved system prompt that:
1. Keeps EVERY hard compliance rule intact (and strengthens the weakest rules listed above).
2. Increases the likelihood of reaching a compliant resolution / agreement.
3. Encourages concise, token-efficient replies.
4. Stays clear and directly usable as a system prompt.

Output ONLY the new system prompt text. No preamble, no explanation, no quotes.`

  const result = await runLLM({
    model: params.model ?? SMART_MODEL,
    system: 'You rewrite system prompts. Output only the prompt text.',
    prompt: generationPrompt,
    maxOutputTokens: 700,
    temperature: 0.8,
    component: 'prompt_generation',
    operation: 'prompt_generation',
    tracker: params.tracker,
  })

  return {
    promptText: result.text.trim(),
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd,
  }
}
