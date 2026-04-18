/**
 * Evaluation Metrics Calculator
 * Computes all metrics for a conversation
 */

import { ConversationScore, Message } from '@/lib/types'
import { complianceChecker, ComplianceCheckResult } from '@/lib/compliance-rules'
import { estimateSentiment, estimateOutcome } from '@/lib/utils-collections'

export class MetricsCalculator {
  /**
   * Calculate resolution rate (0-1): did the conversation achieve its goal?
   */
  static calculateResolutionRate(
    outcome: 'agreement' | 'no_deal' | 'legal' | 'exhausted',
    messageCount: number
  ): number {
    // Simple heuristic: resolutions with agreement are 1.0, others degrade
    const baseRate =
      outcome === 'agreement' ? 1.0 : outcome === 'legal' ? 0.3 : 0.0
    const messageBonus = Math.min(0.2, messageCount * 0.05) // Effort bonus
    return Math.min(1.0, baseRate + messageBonus)
  }

  /**
   * Calculate context efficiency (0-1): tokens used vs effectiveness
   */
  static calculateContextEfficiency(
    inputTokens: number,
    outputTokens: number,
    resolution: number,
    maxBudget: number = 2000
  ): number {
    const totalTokens = inputTokens + outputTokens
    const tokenRatio = totalTokens / maxBudget

    // Efficiency is high if using few tokens with high resolution
    if (tokenRatio === 0) return 0
    if (tokenRatio > 1) return 0 // Exceeded budget

    // Linear: best if resolution is high AND tokens are low
    const efficiency = (1 - tokenRatio) * resolution
    return Math.max(0, Math.min(1, efficiency))
  }

  /**
   * Calculate borrower sentiment (-1 to 1)
   */
  static calculateBorrowerSentiment(messages: Message[]): number {
    const borrowerMessages = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join(' ')

    return estimateSentiment(borrowerMessages)
  }

  /**
   * Run all compliance checks and return scores
   */
  static runComplianceChecks(
    transcript: string,
    metadata: {
      expectedDebt: string
      debtAgeInDays: number
      callTimestamp: string
      previousCallTimestamps: string[]
    }
  ): {
    overallScore: number
    breakdown: Record<string, number>
  } {
    const checks = complianceChecker.runAllChecks(transcript, metadata)

    const breakdown: Record<string, number> = {}
    checks.forEach((check) => {
      breakdown[`rule_${check.rule_id}_${check.rule_name.toLowerCase().replace(/\s+/g, '_')}`] =
        check.score
    })

    const overallScore = complianceChecker.calculateOverallScore(checks)

    return { overallScore, breakdown }
  }

  /**
   * Calculate all metrics for a conversation
   */
  static calculateAllMetrics(options: {
    messages: Message[]
    transcript: string
    inputTokens: number
    outputTokens: number
    borrowerData: any
    agentName: string
  }): Partial<ConversationScore> {
    const {
      messages,
      transcript,
      inputTokens,
      outputTokens,
      borrowerData,
      agentName,
    } = options

    const outcome = estimateOutcome(transcript)
    const resolutionRate = this.calculateResolutionRate(
      outcome,
      messages.length
    )
    const contextEfficiency = this.calculateContextEfficiency(
      inputTokens,
      outputTokens,
      resolutionRate
    )
    const borrowerSentiment = this.calculateBorrowerSentiment(messages)

    const complianceResult = this.runComplianceChecks(transcript, {
      expectedDebt: `$${(borrowerData.debt_amount_cents / 100).toFixed(2)}`,
      debtAgeInDays: borrowerData.debt_age_days,
      callTimestamp: new Date().toISOString(),
      previousCallTimestamps: [],
    })

    return {
      resolution_rate: resolutionRate,
      compliance_score: complianceResult.overallScore,
      context_efficiency: contextEfficiency,
      borrower_sentiment: borrowerSentiment,
      rule_1_identity: complianceResult.breakdown['rule_1_identity'] ?? 0,
      rule_2_tone: complianceResult.breakdown['rule_2_professional_tone'] ?? 0,
      rule_3_threats: complianceResult.breakdown['rule_3_no_false_threats'] ?? 0,
      rule_4_privacy: complianceResult.breakdown['rule_4_privacy_protection'] ?? 0,
      rule_5_harassment: complianceResult.breakdown['rule_5_no_harassment'] ?? 0,
      rule_6_accuracy: complianceResult.breakdown['rule_6_debt_accuracy'] ?? 0,
      rule_7_debt_validity: complianceResult.breakdown['rule_7_debt_validity'] ?? 0,
      rule_8_calls: complianceResult.breakdown['rule_8_tcpa_compliance'] ?? 0,
    }
  }
}
