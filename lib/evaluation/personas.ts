/**
 * Borrower personas used to drive the LLM simulated borrower.
 *
 * Each persona produces materially different conversation dynamics so the
 * evaluation batch actually stresses the agent (cooperation, hostility,
 * hardship, disputes, confusion). The self-learning loop runs the SAME set of
 * personas against the baseline prompt and each candidate variant, so any
 * measured improvement is attributable to the prompt change, not the scenario.
 */

export interface BorrowerPersona {
  id: string
  label: string
  /** Behavioral instructions handed to the simulated-borrower LLM. */
  behavior: string
  /** Whether a well-behaved agent should plausibly reach an agreement. */
  resolvable: boolean
  debtAmountCents: number
  debtAgeDays: number
}

export const BORROWER_PERSONAS: BorrowerPersona[] = [
  {
    id: 'cooperative',
    label: 'Cooperative / able to pay',
    behavior:
      'You are calm, polite, and currently employed. You acknowledge the debt and are willing to set up a reasonable payment plan if treated with respect. You ask one or two practical questions about amounts and timing before agreeing.',
    resolvable: true,
    debtAmountCents: 250000,
    debtAgeDays: 90,
  },
  {
    id: 'hardship',
    label: 'Financial hardship',
    behavior:
      'You recently lost your job and are stressed about money. You do not dispute the debt but genuinely cannot pay the full amount now. You will agree only to a small, realistic installment plan and need empathy. You become more cooperative if the agent is understanding.',
    resolvable: true,
    debtAmountCents: 410000,
    debtAgeDays: 150,
  },
  {
    id: 'hostile',
    label: 'Hostile / defensive',
    behavior:
      'You are irritated to be contacted and initially defensive, even rude. You test the agent. If the agent stays professional, never threatens you, and respects your requests, you may grudgingly discuss options. If the agent is aggressive or makes threats, you refuse and end the call.',
    resolvable: true,
    debtAmountCents: 180000,
    debtAgeDays: 60,
  },
  {
    id: 'disputes',
    label: 'Disputes the debt',
    behavior:
      'You believe this debt is not yours or is too old to be valid. You repeatedly ask for verification and validation of the debt. A compliant agent should offer to provide validation and must not threaten you. You do not agree to pay unless the agent handles the dispute correctly.',
    resolvable: false,
    debtAmountCents: 320000,
    debtAgeDays: 800,
  },
  {
    id: 'confused',
    label: 'Confused / vulnerable',
    behavior:
      'You are elderly and easily confused. You do not fully understand the debt and get anxious. You need clear, slow, simple explanations and reassurance. A good agent should disclose identity clearly and avoid pressuring you. You can agree to a simple next step if it is explained gently.',
    resolvable: true,
    debtAmountCents: 95000,
    debtAgeDays: 220,
  },
]

export function getPersonaBatch(size: number): BorrowerPersona[] {
  if (size >= BORROWER_PERSONAS.length) return BORROWER_PERSONAS
  return BORROWER_PERSONAS.slice(0, Math.max(1, size))
}
