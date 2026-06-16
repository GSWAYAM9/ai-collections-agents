/**
 * Conversation runner — actually executes an agent prompt against an
 * LLM-driven simulated borrower, turn by turn.
 *
 * This is the piece that was previously faked: the old harness fabricated a
 * transcript with a hardcoded "Thank you for responding." line. Now the agent
 * (using whatever candidate system prompt is under test) holds a real
 * multi-turn negotiation with a reactive borrower persona, and we return the
 * genuine transcript for scoring.
 */

import { runLLM, type LLMMessage, type CostTracker, CHEAP_MODEL } from '@/lib/llm'
import type { BorrowerPersona } from '@/lib/evaluation/personas'

export interface TranscriptTurn {
  role: 'agent' | 'borrower'
  content: string
}

export interface ConversationResult {
  transcript: TranscriptTurn[]
  agentInputTokens: number
  agentOutputTokens: number
  borrowerTokens: number
  totalAgentTokens: number
  endedEarly: boolean
}

function buildBorrowerSystemPrompt(persona: BorrowerPersona): string {
  const amount = (persona.debtAmountCents / 100).toFixed(2)
  return `You are role-playing as a person who has received a debt collection contact. Stay fully in character and respond ONLY as the borrower (never break character, never describe yourself in the third person).

Your situation:
- Outstanding balance claimed: $${amount}
- Age of the debt: ${persona.debtAgeDays} days

Your character:
${persona.behavior}

Rules:
- Keep replies short and natural (1-3 sentences), like a real phone/chat reply.
- React genuinely to what the collection agent actually says.
- If the agent is abusive, threatening, or non-compliant, respond as a real upset person would.
- If you decide to reach an agreement, say so clearly (e.g. "okay, I'll set up that payment plan").
- If you want to end the conversation, say so clearly (e.g. "I'm hanging up now").`
}

function toBorrowerMessages(transcript: TranscriptTurn[]): LLMMessage[] {
  // From the borrower's POV, the agent is the "user".
  return transcript.map((t) => ({
    role: t.role === 'agent' ? 'user' : 'assistant',
    content: t.content,
  }))
}

function toAgentMessages(transcript: TranscriptTurn[]): LLMMessage[] {
  // From the agent's POV, the borrower is the "user".
  return transcript.map((t) => ({
    role: t.role === 'agent' ? 'assistant' : 'user',
    content: t.content,
  }))
}

const AGREEMENT_RE = /\b(payment plan|i'?ll pay|set up (a )?plan|i agree|let'?s do (it|that)|installment|i can pay)\b/i
const HANGUP_RE = /\b(hang(ing)? up|goodbye|don'?t call|stop calling|we'?re done|end the call|not interested)\b/i

/**
 * Run a full agent <-> borrower conversation for up to `maxTurns` exchanges.
 * The agent speaks first (initial outreach).
 */
export async function runConversation(params: {
  agentName: string
  agentPrompt: string
  persona: BorrowerPersona
  maxTurns?: number
  model?: string
  tracker?: CostTracker
}): Promise<ConversationResult> {
  const { agentName, agentPrompt, persona } = params
  const maxTurns = params.maxTurns ?? 4
  const model = params.model ?? CHEAP_MODEL
  const borrowerSystem = buildBorrowerSystemPrompt(persona)

  const transcript: TranscriptTurn[] = []
  let agentInputTokens = 0
  let agentOutputTokens = 0
  let borrowerTokens = 0
  let endedEarly = false

  const amount = (persona.debtAmountCents / 100).toFixed(2)
  const agentKickoff = `You are initiating contact about an outstanding balance of $${amount} that is ${persona.debtAgeDays} days past due. Open the conversation now.`

  for (let turn = 0; turn < maxTurns; turn++) {
    // --- Agent turn ---
    const agentMsgs: LLMMessage[] =
      transcript.length === 0
        ? [{ role: 'user', content: agentKickoff }]
        : toAgentMessages(transcript)

    const agentResp = await runLLM({
      model,
      system: agentPrompt,
      messages: agentMsgs,
      maxOutputTokens: 220,
      temperature: 0.6,
      component: agentName,
      operation: 'evaluation_agent_turn',
      tracker: params.tracker,
    })
    agentInputTokens += agentResp.inputTokens
    agentOutputTokens += agentResp.outputTokens
    transcript.push({ role: 'agent', content: agentResp.text.trim() })

    // --- Borrower turn ---
    const borrowerResp = await runLLM({
      model,
      system: borrowerSystem,
      messages: toBorrowerMessages(transcript),
      maxOutputTokens: 150,
      temperature: 0.9,
      component: 'simulated_borrower',
      operation: 'evaluation_borrower_turn',
      tracker: params.tracker,
    })
    borrowerTokens += borrowerResp.inputTokens + borrowerResp.outputTokens
    const borrowerText = borrowerResp.text.trim()
    transcript.push({ role: 'borrower', content: borrowerText })

    // Natural early termination
    if (AGREEMENT_RE.test(borrowerText) || HANGUP_RE.test(borrowerText)) {
      endedEarly = true
      break
    }
  }

  return {
    transcript,
    agentInputTokens,
    agentOutputTokens,
    borrowerTokens,
    totalAgentTokens: agentInputTokens + agentOutputTokens,
    endedEarly,
  }
}

export function transcriptToText(transcript: TranscriptTurn[]): string {
  return transcript
    .map((t) => `${t.role === 'agent' ? 'AGENT' : 'BORROWER'}: ${t.content}`)
    .join('\n')
}
