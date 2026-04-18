/**
 * Simulated Borrower Generator
 * Creates realistic but deterministic test scenarios for evaluation
 */

import { Borrower } from '@/lib/types'

export interface SimulatedBorrowerScenario {
  name: string
  personality: 'cooperative' | 'resistant' | 'sympathetic' | 'angry'
  financialSituation: 'struggling' | 'stable' | 'comfortable'
  likelihood: number // 0-1 of reaching agreement
}

export const BORROWER_SCENARIOS: SimulatedBorrowerScenario[] = [
  {
    name: 'Struggling but willing',
    personality: 'sympathetic',
    financialSituation: 'struggling',
    likelihood: 0.8,
  },
  {
    name: 'Resistant debtor',
    personality: 'resistant',
    financialSituation: 'struggling',
    likelihood: 0.2,
  },
  {
    name: 'Cooperative payer',
    personality: 'cooperative',
    financialSituation: 'stable',
    likelihood: 0.9,
  },
  {
    name: 'Angry/frustrated',
    personality: 'angry',
    financialSituation: 'comfortable',
    likelihood: 0.3,
  },
]

export class SimulatedBorrowerGenerator {
  /**
   * Generate a simulated borrower for testing
   */
  static generateBorrower(
    seed: number,
    scenario?: SimulatedBorrowerScenario
  ): Borrower {
    const selectedScenario = scenario || this.selectRandomScenario(seed)

    const names = [
      'John Smith',
      'Sarah Johnson',
      'Michael Chen',
      'Maria Garcia',
      'David Brown',
    ]
    const debtAmounts = [500, 1000, 2500, 5000, 10000]
    const debtAges = [30, 60, 90, 180, 365, 730]

    const nameIndex = seed % names.length
    const debtIndex = (seed * 7) % debtAmounts.length
    const ageIndex = (seed * 13) % debtAges.length

    return {
      id: `test_${seed}`,
      name: names[nameIndex],
      phone_number: `555-${String(1000 + seed).slice(-4)}`,
      email: `borrower${seed}@test.com`,
      debt_amount_cents: debtAmounts[debtIndex] * 100,
      debt_age_days: debtAges[ageIndex],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  /**
   * Generate simulated borrower responses
   */
  static generateBorrowerResponses(scenario: SimulatedBorrowerScenario): string[] {
    const baseResponses = {
      cooperative: [
        "Okay, I understand. I can probably make a payment next week.",
        "Yes, a payment plan would work for me.",
        "That sounds fair. When can we start?",
        "I appreciate you working with me on this.",
      ],
      sympathetic: [
        "I know I owe this, things have been tough lately.",
        "Can you work with me on a payment plan?",
        "I'm sorry for the delay. I'll try my best.",
        "What are my options?",
      ],
      resistant: [
        "I don't think I owe this.",
        "I'm not interested in making any payments right now.",
        "Can you call back later?",
        "I need to talk to a lawyer.",
      ],
      angry: [
        "This is harassment!",
        "I've dealt with enough of this.",
        "Stop calling me.",
        "You people are the worst.",
      ],
    }

    return baseResponses[scenario.personality]
  }

  /**
   * Select scenario based on seed
   */
  private static selectRandomScenario(
    seed: number
  ): SimulatedBorrowerScenario {
    return BORROWER_SCENARIOS[seed % BORROWER_SCENARIOS.length]
  }

  /**
   * Generate test batch
   */
  static generateTestBatch(batchSize: number): Borrower[] {
    return Array.from({ length: batchSize }, (_, i) =>
      this.generateBorrower(i)
    )
  }
}
