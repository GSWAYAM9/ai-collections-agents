/**
 * Unified LLM module — routes ALL model calls directly to the Anthropic API
 * via @ai-sdk/anthropic and the project's ANTHROPIC_API_KEY.
 *
 * This replaces the previous direct @anthropic-ai/sdk usage AND the AI Gateway
 * path. Calls are billed to the Anthropic account that owns ANTHROPIC_API_KEY,
 * so no Vercel AI Gateway card is required.
 *
 * NOTE: if you see `401 invalid x-api-key`, the ANTHROPIC_API_KEY in the project
 * is missing/invalid — replace it in Project Settings > Vars.
 *
 * It also provides:
 *  - Real per-token cost computation + persistent logging to `cost_log`
 *  - A hard cost ceiling (CostTracker) so a self-learning run can never blow past budget
 *  - Both free-text (`runLLM`) and structured (`runStructured`) helpers
 */

import { generateText, Output } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { z } from 'zod'
import { logCost } from '@/lib/supabase-client'

// ---------------------------------------------------------------------------
// Provider — bound explicitly to ANTHROPIC_API_KEY
// ---------------------------------------------------------------------------

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ---------------------------------------------------------------------------
// Models (native Anthropic model IDs)
// ---------------------------------------------------------------------------

/** Cheap, fast model — used for bounded demo runs (sims, agents, judge). */
export const CHEAP_MODEL = 'claude-haiku-4-5'
/** Higher-quality model — available for production-grade runs. */
export const SMART_MODEL = 'claude-sonnet-4-5'

/** Resolves a model id string to an Anthropic language model instance. */
function resolveModel(model: string) {
  return anthropic(model)
}

/** Approx USD pricing per 1M tokens. Used for cost logging + ceiling enforcement. */
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  'claude-sonnet-4-5': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-latest': { input: 0.8, output: 4.0 },
}

function priceFor(model: string) {
  return PRICING[model] ?? { input: 1.0, output: 5.0 }
}

export function computeCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = priceFor(model)
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000
}

// ---------------------------------------------------------------------------
// Cost ceiling — guards an entire run (e.g. a self-learning loop)
// ---------------------------------------------------------------------------

export class CostCeilingExceededError extends Error {
  constructor(spent: number, ceiling: number) {
    super(`Cost ceiling exceeded: $${spent.toFixed(4)} spent of $${ceiling.toFixed(2)} ceiling`)
    this.name = 'CostCeilingExceededError'
  }
}

export class CostTracker {
  private spentUsd = 0
  private inputTokens = 0
  private outputTokens = 0
  private calls = 0

  constructor(private readonly ceilingUsd: number) {}

  /** Throws if the next call would exceed the ceiling (checked after the fact). */
  record(model: string, inputTokens: number, outputTokens: number): number {
    const cost = computeCostUsd(model, inputTokens, outputTokens)
    this.spentUsd += cost
    this.inputTokens += inputTokens
    this.outputTokens += outputTokens
    this.calls += 1
    if (this.spentUsd > this.ceilingUsd) {
      throw new CostCeilingExceededError(this.spentUsd, this.ceilingUsd)
    }
    return cost
  }

  /** Pre-flight guard: stop starting new work once we're at/over budget. */
  assertHasBudget() {
    if (this.spentUsd >= this.ceilingUsd) {
      throw new CostCeilingExceededError(this.spentUsd, this.ceilingUsd)
    }
  }

  get summary() {
    return {
      spentUsd: Number(this.spentUsd.toFixed(6)),
      ceilingUsd: this.ceilingUsd,
      remainingUsd: Number(Math.max(0, this.ceilingUsd - this.spentUsd).toFixed(6)),
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      calls: this.calls,
    }
  }
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

export type LLMMessage = { role: 'user' | 'assistant'; content: string }

export interface RunLLMOptions {
  model?: string
  system?: string
  prompt?: string
  messages?: LLMMessage[]
  maxOutputTokens?: number
  temperature?: number
  /** Component label for cost_log (e.g. 'assessment', 'judge', 'simulated_borrower'). */
  component: string
  operation?: string
  tracker?: CostTracker
}

export interface LLMResult {
  text: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

async function persistCost(
  component: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  costUsd: number,
  operation: string,
) {
  try {
    await logCost({
      component,
      provider: 'anthropic',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
      operation,
      metadata: { model },
    })
  } catch (err) {
    // Cost logging must never crash a run.
    console.log('[v0] cost log failed (non-fatal):', (err as Error).message)
  }
}

/** Free-text generation through the gateway. */
export async function runLLM(opts: RunLLMOptions): Promise<LLMResult> {
  const model = opts.model ?? CHEAP_MODEL
  opts.tracker?.assertHasBudget()

  const result = await generateText({
    model: resolveModel(model),
    system: opts.system,
    ...(opts.messages ? { messages: opts.messages } : { prompt: opts.prompt ?? '' }),
    maxOutputTokens: opts.maxOutputTokens ?? 600,
    temperature: opts.temperature ?? 0.7,
  })

  const inputTokens = result.usage?.inputTokens ?? 0
  const outputTokens = result.usage?.outputTokens ?? 0
  const costUsd = computeCostUsd(model, inputTokens, outputTokens)
  opts.tracker?.record(model, inputTokens, outputTokens)
  await persistCost(opts.component, model, inputTokens, outputTokens, costUsd, opts.operation ?? 'conversation')

  return { text: result.text, inputTokens, outputTokens, costUsd }
}

export interface RunStructuredOptions<T extends z.ZodType> extends RunLLMOptions {
  schema: T
}

export interface StructuredResult<T> extends LLMResult {
  object: T
}

/** Structured generation through the gateway using Output.object(). */
export async function runStructured<T extends z.ZodType>(
  opts: RunStructuredOptions<T>,
): Promise<StructuredResult<z.infer<T>>> {
  const model = opts.model ?? CHEAP_MODEL
  opts.tracker?.assertHasBudget()

  const result = await generateText({
    model: resolveModel(model),
    system: opts.system,
    ...(opts.messages ? { messages: opts.messages } : { prompt: opts.prompt ?? '' }),
    maxOutputTokens: opts.maxOutputTokens ?? 800,
    temperature: opts.temperature ?? 0.2,
    output: Output.object({ schema: opts.schema }),
  })

  const inputTokens = result.usage?.inputTokens ?? 0
  const outputTokens = result.usage?.outputTokens ?? 0
  const costUsd = computeCostUsd(model, inputTokens, outputTokens)
  opts.tracker?.record(model, inputTokens, outputTokens)
  await persistCost(opts.component, model, inputTokens, outputTokens, costUsd, opts.operation ?? 'structured')

  return {
    object: result.experimental_output as z.infer<T>,
    text: result.text,
    inputTokens,
    outputTokens,
    costUsd,
  }
}
