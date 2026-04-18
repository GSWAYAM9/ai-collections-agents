/**
 * Workflow Activities - Executable operations in the Temporal workflow
 */

import { AssessmentAgent } from '@/lib/agents/assessment-agent'
import { ResolutionAgent } from '@/lib/agents/resolution-agent'
import { FinalNoticeAgent } from '@/lib/agents/final-notice-agent'
import {
  getCaseWithBorrower,
  insertConversation,
  insertMessage,
  supabaseAdmin,
} from '@/lib/supabase-client'
import { v4 as uuidv4 } from 'uuid'

export interface WorkflowContext {
  caseId: string
  borrowerId: string
  retryCount: number
}

/**
 * Activity: Run Assessment Agent
 */
export async function assessmentActivity(context: WorkflowContext): Promise<{
  success: boolean
  handoff: string
  outcome: string
}> {
  const caseData = await getCaseWithBorrower(context.caseId)

  const conversationId = uuidv4()

  // Create conversation record
  const conversation = await insertConversation({
    case_id: context.caseId,
    agent_name: 'assessment',
    medium: 'chat',
    status: 'in_progress',
  })

  // Initialize agent
  const agent = new AssessmentAgent(conversationId, caseData.borrowers)

  try {
    // Simulate user interaction (in real system, would be actual user input)
    const response = await agent.run('')

    // Store messages
    await insertMessage({
      conversation_id: conversationId,
      role: 'assistant',
      content: response.message,
    })

    // Get handoff summary
    const handoff = await agent.getHandoffSummary()

    // Mark conversation complete
    await supabaseAdmin
      .from('conversations')
      .update({ status: 'completed' })
      .eq('id', conversation.id)

    return {
      success: true,
      handoff,
      outcome: 'assessment_complete',
    }
  } catch (error) {
    await supabaseAdmin
      .from('conversations')
      .update({ status: 'failed' })
      .eq('id', conversation.id)

    throw error
  }
}

/**
 * Activity: Run Resolution Agent
 */
export async function resolutionActivity(context: WorkflowContext & {
  assessmentHandoff: string
}): Promise<{
  success: boolean
  handoff: string
  outcome: string
  agreed: boolean
}> {
  const caseData = await getCaseWithBorrower(context.caseId)

  const conversationId = uuidv4()

  const conversation = await insertConversation({
    case_id: context.caseId,
    agent_name: 'resolution',
    medium: 'voice',
    status: 'in_progress',
  })

  const agent = new ResolutionAgent(
    conversationId,
    caseData.borrowers,
    context.assessmentHandoff
  )

  try {
    const response = await agent.run('')

    await insertMessage({
      conversation_id: conversationId,
      role: 'assistant',
      content: response.message,
    })

    const handoff = await agent.getHandoffSummary()
    const agreement = await agent.getAgreementDetails()

    await supabaseAdmin
      .from('conversations')
      .update({ status: 'completed' })
      .eq('id', conversation.id)

    return {
      success: true,
      handoff,
      outcome: agreement.agreed ? 'agreement_reached' : 'resolution_attempt',
      agreed: agreement.agreed || false,
    }
  } catch (error) {
    await supabaseAdmin
      .from('conversations')
      .update({ status: 'failed' })
      .eq('id', conversation.id)

    throw error
  }
}

/**
 * Activity: Run Final Notice Agent
 */
export async function finalNoticeActivity(context: WorkflowContext & {
  resolutionHandoff: string
  agreed: boolean
}): Promise<{
  success: boolean
  handoff: string
  finalOutcome: string
}> {
  if (context.agreed) {
    return {
      success: true,
      handoff: 'Agreement reached - skipping final notice',
      finalOutcome: 'resolved',
    }
  }

  const caseData = await getCaseWithBorrower(context.caseId)

  const conversationId = uuidv4()

  const conversation = await insertConversation({
    case_id: context.caseId,
    agent_name: 'final_notice',
    medium: 'chat',
    status: 'in_progress',
  })

  const agent = new FinalNoticeAgent(
    conversationId,
    caseData.borrowers,
    context.resolutionHandoff,
    false
  )

  try {
    const response = await agent.run('')

    await insertMessage({
      conversation_id: conversationId,
      role: 'assistant',
      content: response.message,
    })

    const nextAction = await agent.determineNextAction()

    // Mark case status based on outcome
    const caseStatus =
      nextAction === 'payment_made' || nextAction === 'payment_promised'
        ? 'resolved'
        : nextAction === 'escalate_legal'
          ? 'legal'
          : 'exhausted'

    await supabaseAdmin
      .from('cases')
      .update({ status: caseStatus })
      .eq('id', context.caseId)

    await supabaseAdmin
      .from('conversations')
      .update({ status: 'completed' })
      .eq('id', conversation.id)

    return {
      success: true,
      handoff: 'Final notice sent',
      finalOutcome: caseStatus,
    }
  } catch (error) {
    await supabaseAdmin
      .from('conversations')
      .update({ status: 'failed' })
      .eq('id', conversation.id)

    throw error
  }
}

/**
 * Activity: Handle Retry
 */
export async function retryActivity(context: WorkflowContext): Promise<{
  shouldRetry: boolean
  nextRetryIn: number
}> {
  const { caseId, retryCount } = context
  const maxRetries = 3

  if (retryCount >= maxRetries) {
    // Mark case as exhausted
    await supabaseAdmin
      .from('cases')
      .update({ status: 'exhausted', retry_count: retryCount })
      .eq('id', caseId)

    return { shouldRetry: false, nextRetryIn: 0 }
  }

  // Exponential backoff: 1min, 2min, 4min
  const nextRetryIn = Math.pow(2, retryCount) * 60 * 1000

  await supabaseAdmin
    .from('cases')
    .update({ retry_count: retryCount + 1 })
    .eq('id', caseId)

  return { shouldRetry: true, nextRetryIn }
}

/**
 * Activity: Log Temporal Event
 */
export async function logEventActivity(data: any): Promise<void> {
  const { error } = await supabaseAdmin
    .from('temporal_events')
    .insert([
      {
        workflow_id: data.workflowId,
        run_id: data.runId,
        event_type: data.eventType,
        case_id: data.caseId,
        details: data.details,
      },
    ])

  if (error) throw error
}
