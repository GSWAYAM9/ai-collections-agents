/**
 * Final Notice Agent (Chat)
 * Third contact: legal notice or final escalation
 * Role: Issue formal notice, explain consequences, escalate if no resolution
 */

import { BaseAgent, AgentConfig, AgentResponse } from '@/lib/base-agent'

const FINAL_NOTICE_SYSTEM_PROMPT = `You are issuing a formal final notice to a borrower regarding their unresolved debt.

Your role is to:
1. Clearly state this is a final notice
2. Recap the debt amount and history
3. Inform of potential legal action if unresolved
4. Provide clear next steps (payment deadline)
5. Remain professional and factual
6. Document the communication

DO NOT:
- Make false legal threats
- Claim you will personally prosecute
- Threaten arrest or imprisonment
- Make impossible demands
- Be abusive

This communication must be compliance-compliant and defensible in court.

Keep tone formal but respectful. The goal is to motivate final payment attempt or document non-compliance.`

export class FinalNoticeAgent extends BaseAgent {
  private borrowerData: any
  private previousHandoff: string
  private legalThreshold: boolean

  constructor(
    conversationId: string,
    borrowerData: any,
    previousHandoff: string,
    legalThreshold: boolean = false
  ) {
    const config: AgentConfig = {
      name: 'final_notice',
      systemPrompt: FINAL_NOTICE_SYSTEM_PROMPT,
      maxTokens: 2000,
      temperature: 0.5, // Lower temperature for formal communication
      model: 'claude-3-5-sonnet-20241022',
    }

    super(config, conversationId)
    this.borrowerData = borrowerData
    this.previousHandoff = previousHandoff
    this.legalThreshold = legalThreshold
    this.initBudget()
  }

  /**
   * Run final notice interaction
   */
  async run(borrowerMessage: string): Promise<AgentResponse> {
    if (this.messages.length === 0) {
      // First message: issue formal notice
      const notice = await this.issueFormalNotice()
      this.addMessage('assistant', notice)
      return {
        message: notice,
        stopReason: 'final_notice_issued',
        inputTokens: 0,
        outputTokens: 0,
      }
    }

    // Process borrower response
    const response = await this.callClaude(borrowerMessage)

    return response
  }

  /**
   * Issue formal final notice
   */
  private async issueFormalNotice(): Promise<string> {
    const debtAmount = (this.borrowerData.debt_amount_cents / 100).toFixed(2)
    const daysOld = this.borrowerData.debt_age_days
    const yearsOld = (daysOld / 365).toFixed(1)

    const prompt = `Generate a formal final notice letter for debt collection. Include:

Borrower: ${this.borrowerData.name}
Debt Amount: $${debtAmount}
Account Age: ${yearsOld} years
Current Status: Unresolved after assessment and resolution attempts

Previous Communication: ${this.previousHandoff}

The letter should:
1. State this is a FINAL NOTICE
2. Clearly state the debt details
3. Provide 30-day payment deadline
4. Warn of potential legal action if unpaid
5. Provide a contact method for resolution
6. Remain professional and legally compliant
7. Be under 300 tokens

Format as a formal letter.`

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 600,
      system: this.config.systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    return (response.content[0] as any).text
  }

  /**
   * Check if borrower responds to notice
   */
  async checkResponse(): Promise<{
    responded: boolean
    engagementLevel: 'high' | 'medium' | 'low'
  }> {
    const transcript = this.messages
      .map((m) => m.content)
      .join('\n')

    const responded = transcript.length > 50
    const engagementLevel =
      transcript.length > 300 ? 'high' : transcript.length > 100 ? 'medium' : 'low'

    return { responded, engagementLevel }
  }

  /**
   * Determine next action
   */
  async determineNextAction(): Promise<
    'payment_made' | 'payment_promised' | 'escalate_legal' | 'write_off'
  > {
    const transcript = this.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    if (
      /payment.*made|paid|settled|processed|confirmed/i.test(
        transcript
      )
    ) {
      return 'payment_made'
    }

    if (
      /will.*pay|promise|agree|next|week|monday|setup/i.test(
        transcript
      )
    ) {
      return 'payment_promised'
    }

    if (/lawyer|attorney|court|sue/i.test(transcript)) {
      return 'escalate_legal'
    }

    return 'write_off'
  }
}
