#!/usr/bin/env node
/**
 * Reproducible self-learning runner.
 *
 * Runs one full learning loop (baseline -> candidate -> t-test -> adopt) for an
 * agent, then a Darwin-Gödel meta-evaluation over the baseline run, and writes
 * an evolution report to evaluation/results/.
 *
 * Usage:
 *   node --env-file-if-exists=/vercel/share/.env.project -r ts-node/register scripts/run-evaluation.ts --agent assessment --batch 4
 *
 * Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AI_GATEWAY_API_KEY (or zero-config gateway).
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runSelfLearningLoop } from '../lib/learning/self-learning-loop'
import { runMetaEvaluation } from '../lib/learning/meta-evaluator'
import { CostTracker } from '../lib/llm'
import type { AgentName } from '../lib/agents/prompts'

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`)
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback
}

async function main() {
  const agent = arg('agent', 'assessment') as AgentName
  const batch = parseInt(arg('batch', '4'), 10)

  console.log('Collections AI — Reproducible Self-Learning Runner')
  console.log('==================================================\n')
  console.log(`Agent: ${agent} · batch: ${batch}\n`)

  console.log('1/2 Running self-learning loop…')
  const loop = await runSelfLearningLoop({
    agentName: agent,
    batchSize: batch,
    maxTurns: 4,
    costCeilingUsd: 5,
  })
  console.log(`   ${loop.decision}`)
  console.log(`   baseline overall=${loop.baseline.avgOverall}  candidate overall=${loop.candidate.avgOverall}`)
  console.log(`   p=${loop.pValue}  cost=$${loop.cost.spentUsd.toFixed(4)}\n`)

  console.log('2/2 Running meta-evaluation over baseline run…')
  const metaTracker = new CostTracker(2)
  const meta = await runMetaEvaluation({ runId: loop.baseline.runId, sampleSize: Math.max(4, batch), tracker: metaTracker })
  console.log(`   ${meta.reasoning}\n`)

  const outDir = join(process.cwd(), 'evaluation', 'results')
  mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = join(outDir, `evolution-${agent}-${stamp}.json`)
  writeFileSync(file, JSON.stringify({ loop, meta }, null, 2))
  console.log(`Wrote ${file}`)
}

main().catch((e) => {
  console.error('\nRunner failed:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
