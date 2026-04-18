/**
 * Resolution Agent (Voice via Vapi)
 * Second contact: negotiate payment options, reach agreement
 * Role: Present payment options, negotiate terms, secure commitment
 */

import { BaseAgent, AgentConfig, AgentResponse } from '@/lib/base-agent'

const RESOLUTION_SYSTEM_PROMPT = `You are a skilled debt resolution specialist. Your role is to:

1. Review the borrower's situation from the assessment
2. Present realistic payment options:
   - Lump sum settlement (percentage discount)
   - Payment plan (monthly installments)
   - Full payment terms
3. Negotiate terms based on borrower's circumstances
4. Document any agreement reached
5. Be firm but fair and compassionate

DO NOT:
- Make threats
- Claim false settlement authority
- Agree to impossible terms
- Violate TCPA regulations
- Pressure unreasonably

Your goal is to secure a binding agreement OR clearly document why agreement isn't possible.

Keep responses conversational and focused on finding mutually acceptable terms.`

export interface ResolutionOptions {
  lumpSumOffer: number // Discounted settlement amount
  paymentPlans: Array<{
    months: number
    monthlyAmount: number
    totalAmount: number
  }>
  fullPaymentTerms: {
    dueDate: string
    amount: number
  }
}

export class ResolutionAgent extends BaseAgent {
  private borrowerData: any
  private assessmentHandoff: string
  private proposedOffer?: ResolutionOptions

  constructor(
    conversationId: string,
    borrowerData: any,
    assessmentHandoff: string
  ) {
    const config: AgentConfig = {
      name: 'resolution',
      systemPrompt: RESOLUTION_SYSTEM_PROMPT,
      maxTokens: 2000,
      temperature: 0.6, // Slightly lower temperature for negotiation
      model: 'claude-3-5-sonnet-20241022',
    }

    super(config, conversationId)
    this.borrowerData = borrowerData
    this.assessmentHandoff = assessmentHandoff
    this.initBudget()
  }

  /**
   * Run resolution interaction
   */
  async run(borrowerMessage: string): Promise<AgentResponse> {
    if (this.messages.length === 0) {
      // First message: present options based on assessment
      const opening = await this.presentOptions()
      this.addMessage('assistant', opening)
      return {
        message: opening,
        stopReason: 'resolution_options_presented',
        inputTokens: 0,
        outputTokens: 0,
      }
    }

    // Process borrower response
    const response = await this.callClaude(borrowerMessage)

    // Check if agreement is reached
    if (this.isAgreementReached(response.message)) {
      response.stopReason = 'agreement_reached'
    }

    return response
  }

  /**
   * Present payment options to borrower
   */
  private async presentOptions(): Promise<string> {
    const debtAmount = this.borrowerData.debt_amount_cents / 100

    // Calculate resolution options
    this.proposedOffer = {
      lumpSumOffer: debtAmount * 0.6, // 40% discount
      paymentPlans: [
        {
          months: 3,
          monthlyAmount: debtAmount / 3,
          totalAmount: debtAmount,
        },
        {
          months: 6,
          monthlyAmount: debtAmount / 6,
          totalAmount: debtAmount,
        },
        {
          months: 12,
          monthlyAmount: debtAmount / 12,
          totalAmount: debtAmount,
        },
      ],
      fullPaymentTerms: {
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        amount: debtAmount,
      },
    }

    const prompt = `Based on this assessment: "${this.assessmentHandoff}"

Propose payment options for a debt of $${debtAmount.toFixed(2)}:
1. Settlement: $${this.proposedOffer.lumpSumOffer.toFixed(2)} (one time)
2. Payment plan: $${this.proposedOffer.paymentPlans[1].monthlyAmount.toFixed(2)}/month for 6 months
3. Full amount: $${debtAmount.toFixed(2)} by ${this.proposedOffer.fullPaymentTerms.dueDate}

Present these options professionally and ask which option interests them most. Keep it under 150 tokens.`

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 400,
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
   * Check if agreement is reached
   */
  private isAgreementReached(message: string): boolean {
    const agreementPatterns = [
      /agree|yes|ok|sounds.*good|i.*accept|let.*do.*payment|settle/i,
      /let.*start.*month|setup.*plan|first.*payment/i,
    ]

    return agreementPatterns.some((pattern) => pattern.test(message))
  }

  /**
   * Get agreement details if reached
   */
  async getAgreementDetails(): Promise<any> {
    if (this.messages.length < 2) return null

    // Simple extraction - in production would use more sophisticated NLP
    const transcript = this.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    return {
      agreed: this.isAgreementReached(transcript),
      proposedOffer: this.proposedOffer,
      agreementType: this.extractAgreementType(transcript),
    }
  }

  /**
   * Extract agreement type from transcript
   */
  private extractAgreementType(transcript: string): string {
    if (/lump.*sum|settlement|one.*time|$\d+/i.test(transcript)) {
      return 'lump_sum'
    }
    if (/payment.*plan|monthly|month/i.test(transcript)) {
      return 'payment_plan'
    }
    if (/full.*amount|pay.*all|full.*payment/i.test(transcript)) {
      return 'full_payment'
    }
    return 'unknown'
  }
}
