/**
 * Collections Pipeline Workflow
 * Orchestrates the 3-agent pipeline for a single case
 */

import {
  assessmentActivity,
  resolutionActivity,
  finalNoticeActivity,
  retryActivity,
  logEventActivity,
} from '@/lib/workflow/activities'

export interface CollectionsWorkflowInput {
  caseId: string
  borrowerId: string
  maxRetries?: number
}

export interface CollectionsWorkflowOutput {
  caseId: string
  finalOutcome: 'resolved' | 'legal' | 'exhausted'
  conversationCount: number
  totalTokensUsed: number
}

/**
 * Main workflow (non-Temporal version for MVP)
 * In production, this would be an actual Temporal workflow
 */
export async function collectionsWorkflow(
  input: CollectionsWorkflowInput
): Promise<CollectionsWorkflowOutput> {
  const { caseId, borrowerId, maxRetries = 3 } = input

  let retryCount = 0
  let outcome: 'resolved' | 'legal' | 'exhausted' = 'exhausted'
  let conversationCount = 0
  let totalTokensUsed = 0
  let assessmentHandoff = ''
  let resolutionHandoff = ''
  let resolutionAgreed = false

  while (retryCount < maxRetries) {
    try {
      // Log workflow start
      await logEventActivity({
        workflowId: `workflow-${caseId}`,
        runId: `run-${retryCount}`,
        eventType: 'started',
        caseId,
        details: { retry: retryCount },
      })

      // Phase 1: Assessment
      try {
        const assessmentResult = await assessmentActivity({
          caseId,
          borrowerId,
          retryCount,
        })

        conversationCount++
        assessmentHandoff = assessmentResult.handoff

        await logEventActivity({
          workflowId: `workflow-${caseId}`,
          runId: `run-${retryCount}`,
          eventType: 'activity_completed',
          caseId,
          details: { activity: 'assessment', outcome: assessmentResult.outcome },
        })
      } catch (error) {
        console.error('Assessment activity failed:', error)
        throw error
      }

      // Phase 2: Resolution
      try {
        const resolutionResult = await resolutionActivity({
          caseId,
          borrowerId,
          retryCount,
          assessmentHandoff,
        })

        conversationCount++
        resolutionHandoff = resolutionResult.handoff
        resolutionAgreed = resolutionResult.agreed

        if (resolutionResult.agreed) {
          outcome = 'resolved'

          await logEventActivity({
            workflowId: `workflow-${caseId}`,
            runId: `run-${retryCount}`,
            eventType: 'completed',
            caseId,
            details: { outcome: 'resolved', reason: 'agreement_reached' },
          })

          return {
            caseId,
            finalOutcome: outcome,
            conversationCount,
            totalTokensUsed,
          }
        }

        await logEventActivity({
          workflowId: `workflow-${caseId}`,
          runId: `run-${retryCount}`,
          eventType: 'activity_completed',
          caseId,
          details: { activity: 'resolution', outcome: resolutionResult.outcome },
        })
      } catch (error) {
        console.error('Resolution activity failed:', error)
        throw error
      }

      // Phase 3: Final Notice
      try {
        const finalResult = await finalNoticeActivity({
          caseId,
          borrowerId,
          retryCount,
          resolutionHandoff,
          agreed: resolutionAgreed,
        })

        conversationCount++
        outcome = (finalResult.finalOutcome as any) || 'exhausted'

        await logEventActivity({
          workflowId: `workflow-${caseId}`,
          runId: `run-${retryCount}`,
          eventType: 'completed',
          caseId,
          details: { outcome, phase: 'final_notice' },
        })

        return {
          caseId,
          finalOutcome: outcome,
          conversationCount,
          totalTokensUsed,
        }
      } catch (error) {
        console.error('Final notice activity failed:', error)
        throw error
      }
    } catch (error) {
      console.error(`Workflow retry ${retryCount} failed:`, error)

      // Attempt retry
      const retryResult = await retryActivity({
        caseId,
        borrowerId,
        retryCount,
      })

      if (!retryResult.shouldRetry) {
        outcome = 'exhausted'
        break
      }

      // Wait before retry
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(retryResult.nextRetryIn, 5000))
      )

      retryCount++

      await logEventActivity({
        workflowId: `workflow-${caseId}`,
        runId: `run-${retryCount}`,
        eventType: 'retry',
        caseId,
        details: { retryCount, nextRetryIn: retryResult.nextRetryIn },
      })
    }
  }

  return {
    caseId,
    finalOutcome: outcome,
    conversationCount,
    totalTokensUsed,
  }
}
