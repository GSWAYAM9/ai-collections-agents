/**
 * Base Agent Class
 * Abstract base for Assessment, Resolution, and Final Notice agents
 */

import { Anthropic } from '@anthropic-ai/sdk'
import { MessageParam } from '@anthropic-ai/sdk/resources'
import { estimateTokens, tokenManager } from '@/lib/token-manager'
import { config } from '@/lib/config'
import { logCost, insertMessage, insertConversation } from '@/lib/supabase-client'

export interface AgentConfig {
  name: 'assessment' | 'resolution' | 'final_notice'
  systemPrompt: string
  maxTokens: number
  temperature: number
  model: string
}

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentResponse {
  message: string
  stopReason: string
  inputTokens: number
  outputTokens: number
  handoff?: string
}

export abstract class BaseAgent {
  protected client: Anthropic
  protected config: AgentConfig
  protected conversationId: string
  protected messages: AgentMessage[] = []

  constructor(config: AgentConfig, conversationId: string) {
    this.config = config
    this.conversationId = conversationId
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }

  /**
   * Initialize agent budget
   */
  protected initBudget() {
    tokenManager.initBudget(this.config.name, this.config.maxTokens)
  }

  /**
   * Add message to conversation history
   */
  addMessage(role: 'user' | 'assistant', content: string) {
    this.messages.push({ role, content })
  }

  /**
   * Get conversation history as MessageParam[]
   */
  protected getConversationHistory(): MessageParam[] {
    return this.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))
  }

  /**
   * Call Claude API
   */
  protected async callClaude(userMessage: string): Promise<AgentResponse> {
    // Check budget before making call
    const estimatedInputTokens = estimateTokens(
      this.config.systemPrompt + userMessage
    )

    if (!tokenManager.canFit(this.config.name, estimatedInputTokens)) {
      throw new Error(
        `Cannot fit message in budget for agent ${this.config.name}. ` +
          `Estimated: ${estimatedInputTokens}, Remaining: ${tokenManager.getRemaining(this.config.name)}`
      )
    }

    // Add user message to history
    this.addMessage('user', userMessage)

    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 1000,
        system: this.config.systemPrompt,
        temperature: this.config.temperature,
        messages: this.getConversationHistory(),
      })

      const messageContent = response.content[0]
      if (messageContent.type !== 'text') {
        throw new Error('Unexpected response type from Claude')
      }

      const assistantMessage = messageContent.text
      this.addMessage('assistant', assistantMessage)

      // Track token usage
      const { input_tokens, output_tokens } = response.usage
      tokenManager.addUsage(this.config.name, input_tokens, output_tokens)

      // Log cost
      const costUsd = (input_tokens * 0.003 + output_tokens * 0.015) / 1000 // Claude 3 Sonnet pricing
      await logCost({
        component: this.config.name,
        provider: 'anthropic',
        input_tokens,
        output_tokens,
        cost_usd: costUsd,
        operation: 'conversation',
      })

      return {
        message: assistantMessage,
        stopReason: response.stop_reason,
        inputTokens: input_tokens,
        outputTokens: output_tokens,
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Run agent interaction
   */
  abstract run(borrowerMessage: string): Promise<AgentResponse>

  /**
   * Get handoff summary (max 500 tokens)
   */
  async getHandoffSummary(): Promise<string> {
    if (this.messages.length === 0) {
      return ''
    }

    // Create a summary prompt
    const summaryPrompt = `Summarize the key points from this conversation in under 500 tokens for the next agent:\n\n${this.messages.map((m) => `${m.role}: ${m.content}`).join('\n')}`

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: summaryPrompt,
        },
      ],
    })

    const summary = (response.content[0] as any).text
    const tokenCount = estimateTokens(summary)

    // Validate against handoff token limit
    tokenManager.validateHandoffTokens(tokenCount)

    return summary
  }

  /**
   * Get current message history
   */
  getMessageHistory(): AgentMessage[] {
    return [...this.messages]
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      agent: this.config.name,
      messageCount: this.messages.length,
      budget: tokenManager.getStatus(this.config.name),
    }
  }
}
