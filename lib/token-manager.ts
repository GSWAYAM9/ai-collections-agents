/**
 * Token Manager - Enforces strict context budget constraints
 * Ensures no agent exceeds their 2000 token limit
 * Enforces max 500 tokens for handoff summaries
 */

export interface TokenUsage {
  input: number
  output: number
  total: number
}

export interface TokenBudgetConfig {
  agentMaxTokens: number // 2000 per agent
  handoffMaxTokens: number // 500 for handoff summaries
  systemPromptEstimate: number // Conservative estimate
}

const DEFAULT_CONFIG: TokenBudgetConfig = {
  agentMaxTokens: 2000,
  handoffMaxTokens: 500,
  systemPromptEstimate: 150,
}

export class TokenManager {
  private budgets: Map<string, { used: number; limit: number }> = new Map()
  private config: TokenBudgetConfig

  constructor(config: Partial<TokenBudgetConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize budget for an agent
   */
  initBudget(agentId: string, limit: number = this.config.agentMaxTokens) {
    this.budgets.set(agentId, { used: 0, limit })
  }

  /**
   * Add token usage to an agent's budget
   */
  addUsage(agentId: string, input: number, output: number): TokenUsage {
    if (!this.budgets.has(agentId)) {
      this.initBudget(agentId)
    }

    const budget = this.budgets.get(agentId)!
    const total = input + output
    budget.used += total

    const usage: TokenUsage = { input, output, total }

    // Fail-fast: if exceeded, throw error
    if (budget.used > budget.limit) {
      throw new Error(
        `Token budget exceeded for agent ${agentId}: ` +
          `${budget.used} / ${budget.limit} tokens. ` +
          `Exceeded by ${budget.used - budget.limit} tokens.`
      )
    }

    return usage
  }

  /**
   * Get remaining tokens for agent
   */
  getRemaining(agentId: string): number {
    if (!this.budgets.has(agentId)) {
      return this.config.agentMaxTokens
    }
    const budget = this.budgets.get(agentId)!
    return budget.limit - budget.used
  }

  /**
   * Check if we can fit content within remaining budget
   */
  canFit(agentId: string, estimatedTokens: number): boolean {
    const remaining = this.getRemaining(agentId)
    return estimatedTokens <= remaining
  }

  /**
   * Get budget status
   */
  getStatus(agentId: string) {
    if (!this.budgets.has(agentId)) {
      this.initBudget(agentId)
    }
    const budget = this.budgets.get(agentId)!
    return {
      agent: agentId,
      used: budget.used,
      limit: budget.limit,
      remaining: budget.limit - budget.used,
      percentage: (budget.used / budget.limit) * 100,
      exceeded: budget.used > budget.limit,
    }
  }

  /**
   * Validate handoff summary token count (max 500)
   */
  validateHandoffTokens(tokens: number): boolean {
    if (tokens > this.config.handoffMaxTokens) {
      throw new Error(
        `Handoff summary exceeds token limit: ${tokens} / ${this.config.handoffMaxTokens} tokens`
      )
    }
    return true
  }

  /**
   * Reset budget (for testing)
   */
  reset(agentId?: string) {
    if (agentId) {
      this.budgets.delete(agentId)
    } else {
      this.budgets.clear()
    }
  }

  /**
   * Get all budgets (for monitoring)
   */
  getAllBudgets() {
    return Array.from(this.budgets.entries()).map(([agentId, budget]) => ({
      agent: agentId,
      used: budget.used,
      limit: budget.limit,
      remaining: budget.limit - budget.used,
    }))
  }
}

// Estimate tokens using a simple heuristic (Claude/GPT style)
// 1 token ≈ 4 characters or 1 word
export function estimateTokens(text: string): number {
  const charCount = text.length
  const wordCount = text.split(/\s+/).length
  // More conservative estimate
  return Math.ceil(Math.max(charCount / 4, wordCount * 1.3))
}

// Create singleton instance for use across app
export const tokenManager = new TokenManager()
