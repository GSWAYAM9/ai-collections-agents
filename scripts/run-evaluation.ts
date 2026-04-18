#!/usr/bin/env node

/**
 * Quick evaluation runner
 * Tests the system end-to-end with a single evaluation run
 */

import { EvaluationHarness } from './lib/evaluation/evaluation-harness'
import { config, validateConfig } from './lib/config'

async function main() {
  console.log('Collections AI System - Evaluation Runner')
  console.log('=========================================\n')

  // Validate config
  const validation = validateConfig()
  if (!validation.valid) {
    console.error('Configuration invalid:')
    validation.errors.forEach((e) => console.error(`  - ${e}`))
    process.exit(1)
  }

  console.log('✓ Configuration valid\n')

  // Run evaluation
  console.log('Running evaluation harness...')
  const harness = new EvaluationHarness({
    batchSize: 5,
    variants: ['baseline'],
    seed: 42,
  })

  try {
    const result = await harness.runEvaluation()
    const totalCost = harness.getTotalCost()

    console.log('\n✓ Evaluation complete\n')
    console.log('Results:')
    console.log(
      `  Total Conversations: ${result.total_conversations}`
    )
    console.log(
      `  Avg Resolution Rate: ${(result.avg_resolution_rate * 100).toFixed(1)}%`
    )
    console.log(
      `  Avg Compliance Score: ${result.avg_compliance_score.toFixed(1)}`
    )
    console.log(
      `  Avg Context Efficiency: ${(result.avg_context_efficiency * 100).toFixed(1)}%`
    )
    console.log(`  Total Cost: $${totalCost.toFixed(4)}`)
    console.log(`\nRun ID: ${result.run_id}`)
  } catch (error) {
    console.error('\nEvaluation failed:')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
