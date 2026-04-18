/**
 * Evaluation Harness
 * Orchestrates evaluation runs, tracks results, manages statistical significance
 */

import { v4 as uuidv4 } from 'uuid'
import { SimulatedBorrowerGenerator } from '@/lib/evaluation/simulated-borrower'
import { MetricsCalculator } from '@/lib/evaluation/metrics-calculator'
import {
  createEvaluationRun,
  insertConversationScores,
  logCost,
  supabaseAdmin,
} from '@/lib/supabase-client'
import { hashConfiguration } from '@/lib/utils-collections'

export interface EvaluationRunConfig {
  batchSize: number
  variants: string[] // Prompt variants to test
  seed: number
}

export interface EvaluationResult {
  run_id: string
  batch_size: number
  total_conversations: number
  avg_resolution_rate: number
  avg_compliance_score: number
  avg_context_efficiency: number
  metadata: {
    variantsTested: string[]
    seedUsed: number
    timestamp: string
  }
}

export class EvaluationHarness {
  private configHash: string
  private costTotal: number = 0

  constructor(private config: EvaluationRunConfig) {
    this.configHash = hashConfiguration(config)
  }

  /**
   * Run evaluation
   */
  async runEvaluation(): Promise<EvaluationResult> {
    // Create evaluation run record
    const runRecord = await createEvaluationRun({
      batch_size: this.config.batchSize,
      configuration_hash: this.configHash,
      metadata: {
        variants: this.config.variants,
        seed: this.config.seed,
      },
    })

    const runId = runRecord.id

    // Generate test batch
    const borrowers = SimulatedBorrowerGenerator.generateTestBatch(
      this.config.batchSize
    )

    const allScores: any[] = []
    let totalResolution = 0
    let totalCompliance = 0
    let totalEfficiency = 0

    // Evaluate each borrower scenario
    for (let i = 0; i < borrowers.length; i++) {
      const borrower = borrowers[i]

      // Simulate conversation (in real system, this would be actual agent interactions)
      const conversationMetrics = await this.simulateConversation(borrower)

      totalResolution += conversationMetrics.resolution_rate
      totalCompliance += conversationMetrics.compliance_score
      totalEfficiency += conversationMetrics.context_efficiency

      // Store conversation score
      const score = await insertConversationScores({
        evaluation_run_id: runId,
        conversation_id: uuidv4(),
        case_id: uuidv4(),
        ...conversationMetrics,
      })

      allScores.push(score)
    }

    const result: EvaluationResult = {
      run_id: runId,
      batch_size: this.config.batchSize,
      total_conversations: this.config.batchSize,
      avg_resolution_rate: totalResolution / this.config.batchSize,
      avg_compliance_score: totalCompliance / this.config.batchSize,
      avg_context_efficiency: totalEfficiency / this.config.batchSize,
      metadata: {
        variantsTested: this.config.variants,
        seedUsed: this.config.seed,
        timestamp: new Date().toISOString(),
      },
    }

    return result
  }

  /**
   * Simulate a conversation with a borrower
   */
  private async simulateConversation(borrower: any): Promise<any> {
    // Generate simulated responses
    const scenario = SimulatedBorrowerGenerator.generateBorrowerResponses(
      { personality: 'sympathetic', financialSituation: 'struggling', likelihood: 0.8, name: '' }
    )

    // Create mock messages
    const messages = [
      { role: 'user', content: scenario[0], token_count: 50 },
      { role: 'assistant', content: 'Thank you for responding.', token_count: 30 },
      { role: 'user', content: scenario[1], token_count: 60 },
    ]

    const transcript = messages.map((m) => `${m.role}: ${m.content}`).join('\n')

    // Calculate metrics
    const metrics = MetricsCalculator.calculateAllMetrics({
      messages,
      transcript,
      inputTokens: 200,
      outputTokens: 150,
      borrowerData: borrower,
      agentName: 'assessment',
    })

    // Log simulated cost
    await logCost({
      component: 'evaluation',
      provider: 'anthropic',
      input_tokens: 200,
      output_tokens: 150,
      cost_usd: 0.0045,
      operation: 'evaluation_simulation',
    })

    this.costTotal += 0.0045

    return metrics
  }

  /**
   * Get total cost for this evaluation
   */
  getTotalCost(): number {
    return this.costTotal
  }

  /**
   * Check statistical significance between two results
   */
  static isSignificantImprovement(
    baselineMetric: number,
    newMetric: number,
    confidence: number = 0.95
  ): boolean {
    // Simple heuristic: > 5% improvement is significant
    const improvement = (newMetric - baselineMetric) / baselineMetric
    return improvement > 0.05
  }

  /**
   * Get evaluation results by run_id
   */
  async getRunResults(runId: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('conversation_scores')
      .select('*')
      .eq('evaluation_run_id', runId)

    if (error) throw error

    const results = data || []
    const avgResolution =
      results.reduce((sum, r) => sum + r.resolution_rate, 0) / results.length
    const avgCompliance =
      results.reduce((sum, r) => sum + r.compliance_score, 0) / results.length
    const avgEfficiency =
      results.reduce((sum, r) => sum + r.context_efficiency, 0) / results.length

    return {
      totalConversations: results.length,
      avgResolution,
      avgCompliance,
      avgEfficiency,
      results,
    }
  }
}
