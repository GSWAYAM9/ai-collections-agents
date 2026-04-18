/**
 * Assessment Agent (Chat)
 * First contact: builds rapport, gathers information, assesses situation
 * Role: Understand borrower's circumstances, build empathy, assess ability to pay
 */

import { BaseAgent, AgentConfig, AgentResponse } from '@/lib/base-agent'
import { createBorrowerSummary } from '@/lib/utils-collections'

const ASSESSMENT_SYSTEM_PROMPT = `You are an empathetic debt collection representative working for a financial recovery agency. Your role is to:

1. Introduce yourself clearly as a debt collection agent
2. Verify borrower identity and acknowledge their situation
3. Gather information about their financial circumstances
4. Assess their ability and willingness to pay
5. Show professionalism and respect at all times
6. Build rapport and understanding

DO NOT:
- Make threats or illegal statements
- Be aggressive or disrespectful
- Claim false information about the debt
- Call outside 8 AM - 9 PM
- Harass or abuse the borrower

Your goal is to understand the situation and prepare a complete briefing for the resolution agent who will discuss payment options.

Keep your responses concise (under 200 tokens) and conversational. Ask one or two questions at a time.`

export class AssessmentAgent extends BaseAgent {
  private borrowerData: any

  constructor(conversationId: string, borrowerData: any) {
    const config: AgentConfig = {
      name: 'assessment',
      systemPrompt: ASSESSMENT_SYSTEM_PROMPT,
      maxTokens: 2000,
      temperature: 0.7,
      model: 'claude-3-5-sonnet-20250514',
    }

    super(config, conversationId)
    this.borrowerData = borrowerData
    this.initBudget()
  }

  /**
   * Run assessment interaction
   */
  async run(borrowerMessage: string): Promise<AgentResponse> {
    // First message: start with greeting and situation explanation
    if (this.messages.length === 0) {
      const greeting = await this.sendGreeting()
      this.addMessage('assistant', greeting)
      return {
        message: greeting,
        stopReason: 'assessment_greeting',
        inputTokens: 0,
        outputTokens: 0,
      }
    }

    // Subsequent messages: process response and ask follow-up
    const response = await this.callClaude(borrowerMessage)

    return response
  }

  /**
   * Send initial greeting
   */
  private async sendGreeting(): Promise<string> {
    const borrowerInfo = createBorrowerSummary(this.borrowerData)

    const greetingPrompt = `You are beginning a call with a borrower. Here is their information:

${borrowerInfo}

Send a brief, professional greeting (2-3 sentences) that:
1. Introduces you as a debt collection representative
2. Acknowledges the debt
3. Invites them to discuss their situation

Keep it under 100 tokens.`

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 300,
      system: this.config.systemPrompt,
      messages: [
        {
          role: 'user',
          content: greetingPrompt,
        },
      ],
    })

    return (response.content[0] as any).text
  }

  /**
   * Assessment agents should track key insights
   */
  async getInsights(): Promise<any> {
    const transcript = this.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    // Extract insights about borrower
    return {
      totalMessages: this.messages.length,
      tone: 'neutral', // Could be improved with sentiment analysis
      keyPoints: [], // Would extract from transcript
      readyForResolution: this.messages.length > 3, // Simple heuristic
    }
  }
}
