/**
 * Utility functions for the collections AI system
 */

import { Message } from '@/lib/types'

/**
 * Format messages into a prompt context
 */
export function formatConversationContext(messages: Message[]): string {
  return messages
    .map((msg) => {
      const role =
        msg.role === 'user'
          ? 'Borrower'
          : msg.role === 'assistant'
            ? 'Agent'
            : 'System'
      return `${role}: ${msg.content}`
    })
    .join('\n')
}

/**
 * Estimate conversation outcome based on patterns
 */
export function estimateOutcome(
  transcript: string
): 'agreement' | 'no_deal' | 'legal' | 'exhausted' {
  if (
    /agree|yes.*payment|setup.*plan|settlement/i.test(
      transcript
    )
  ) {
    return 'agreement'
  }
  if (/legal|attorney|court|sue/i.test(transcript)) {
    return 'legal'
  }
  if (/no.*way|won't.*pay|blocked|hang.*up/i.test(transcript)) {
    return 'no_deal'
  }
  return 'exhausted'
}

/**
 * Calculate sentiment from transcript (simple heuristic)
 */
export function estimateSentiment(transcript: string): number {
  const positive = /(good|thank|appreciate|agree|yes|ok|sure|fine)/gi.exec(
    transcript
  )?.length || 0
  const negative = /(no|angry|upset|frustrated|hate|refuse|block)/gi.exec(
    transcript
  )?.length || 0

  if (positive === 0 && negative === 0) return 0
  return (positive - negative) / (positive + negative)
}

/**
 * Extract key information from a case
 */
export function extractCaseInfo(
  transcript: string,
  borrowerData: any
): Record<string, any> {
  const info: Record<string, any> = {}

  // Try to extract payment acknowledgment
  const paymentMatch = transcript.match(
    /\$?([\d,]+(?:\.\d{2})?)/
  )
  if (paymentMatch) {
    info.acknowledgedAmount = paymentMatch[1]
  }

  // Try to extract proposed payment date
  const dateMatch = transcript.match(
    /(next\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next\s+week|\d{1,2}\/\d{1,2})/i
  )
  if (dateMatch) {
    info.proposedPaymentDate = dateMatch[0]
  }

  return info
}

/**
 * Validate transcript completeness
 */
export function isTranscriptComplete(transcript: string): boolean {
  return (
    transcript && transcript.length > 50 && transcript.includes('Agent:')
  )
}

/**
 * Hash configuration for versioning
 */
export function hashConfiguration(config: Record<string, any>): string {
  const jsonString = JSON.stringify(config)
  let hash = 0
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Generate unique case ID
 */
export function generateCaseId(): string {
  return `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Format cost display
 */
export function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Calculate seconds to wait for retry with exponential backoff
 */
export function calculateBackoff(
  retryCount: number,
  baseDelay: number = 1000,
  maxDelay: number = 60000
): number {
  const delay = baseDelay * Math.pow(2, retryCount)
  return Math.min(delay, maxDelay)
}

/**
 * Parse debt information from borrower data
 */
export function formatDebtInfo(borrower: any): string {
  const amount = (borrower.debt_amount_cents / 100).toFixed(2)
  const age = borrower.debt_age_days
  const years = (age / 365).toFixed(1)
  return `$${amount} outstanding for ${years} years (${age} days)`
}

/**
 * Create a borrower summary for agent context
 */
export function createBorrowerSummary(borrower: any): string {
  return `
Borrower: ${borrower.name}
Phone: ${borrower.phone_number}
Debt: $${(borrower.debt_amount_cents / 100).toFixed(2)}
Age: ${borrower.debt_age_days} days
Email: ${borrower.email || 'Not provided'}
`.trim()
}
