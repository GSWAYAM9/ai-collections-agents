'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type AgentName = 'assessment' | 'resolution' | 'final_notice'

interface LoopResult {
  agentName: string
  baseline: PublicMetrics
  candidate: PublicMetrics
  variantId: string
  improvement: number
  pValue: number
  significant: boolean
  meetsCompliance: boolean
  adopted: boolean
  decision: string
  weakRules: string[]
  newPrompt: string
  cost: { spentUsd: number; ceilingUsd: number; calls: number }
}

interface PublicMetrics {
  label: string
  runId: string
  numConversations: number
  complianceRate: number
  resolutionRate: number
  avgEfficiency: number
  avgSentiment: number
  avgOverall: number
}

interface MetaResult {
  runId: string
  sampled: number
  disagreements: { persona: string; judgeValue: number; metaValue: number; magnitude: number; blindspot: string }[]
  meanAbsComplianceGap: number
  primaryConsistentlyLenient: boolean
  methodologyChange: string | null
  adopted: boolean
  recomputedOverall: number | null
  originalOverall: number
  reasoning: string
}

interface Report {
  summary: {
    totalRuns: number
    totalVariants: number
    adoptedVariants: number
    metaRevisions: number
    adoptedMetaRevisions: number
    totalCostUsd: number
  }
  runs: any[]
  variants: any[]
  revisions: any[]
}

const AGENTS: { id: AgentName; label: string }[] = [
  { id: 'assessment', label: 'Assessment' },
  { id: 'resolution', label: 'Resolution' },
  { id: 'final_notice', label: 'Final Notice' },
]

export default function LearningLab() {
  const [agent, setAgent] = useState<AgentName>('assessment')
  const [batchSize, setBatchSize] = useState(4)
  const [loopBusy, setLoopBusy] = useState(false)
  const [metaBusy, setMetaBusy] = useState(false)
  const [loop, setLoop] = useState<LoopResult | null>(null)
  const [meta, setMeta] = useState<MetaResult | null>(null)
  const [error, setError] = useState('')
  const [report, setReport] = useState<Report | null>(null)

  const loadReport = useCallback(async () => {
    try {
      const res = await fetch('/api/learning/report')
      const data = await res.json()
      if (data.success) setReport(data)
    } catch {
      /* non-fatal */
    }
  }, [])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const runLoop = async () => {
    setLoopBusy(true)
    setError('')
    setLoop(null)
    setMeta(null)
    try {
      const res = await fetch('/api/learning/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: agent, batchSize, maxTurns: 4, costCeilingUsd: 3.0 }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Loop failed')
      setLoop(data.result)
      loadReport()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoopBusy(false)
    }
  }

  const runMeta = async () => {
    if (!loop) return
    setMetaBusy(true)
    setError('')
    try {
      const res = await fetch('/api/meta/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: loop.baseline.runId, sampleSize: Math.max(4, batchSize) }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Meta-eval failed')
      setMeta(data.result)
      loadReport()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setMetaBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <Link href="/" className="text-2xl font-bold hover:text-slate-300">
              Collections AI
            </Link>
            <p className="text-xs text-slate-400">Self-Learning Lab</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm">
              Dashboard
            </Link>
            <Link href="/admin" className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm">
              Admin
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-balance">Self-Learning Loop &amp; Meta-Evaluation</h1>
          <p className="text-slate-400 max-w-3xl text-pretty">
            Run a real closed feedback loop: the system evaluates the current prompt against simulated borrowers,
            generates an improved candidate, A/B tests it on the same scenarios, applies a Welch t-test, and only
            adopts the candidate if the gain is statistically significant <em>and</em> compliance stays at or above the
            98/100 gate. The Darwin-Gödel meta-evaluator then audits the judge itself.
          </p>
        </header>

        {/* Controls */}
        <section className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Agent</label>
              <div className="flex gap-2">
                {AGENTS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAgent(a.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      agent === a.id ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Batch size (conversations per arm)</label>
              <input
                type="range"
                min={2}
                max={8}
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value, 10))}
                className="w-48 align-middle"
              />
              <span className="ml-3 font-semibold">{batchSize}</span>
            </div>
            <button
              onClick={runLoop}
              disabled={loopBusy || metaBusy}
              className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:text-slate-400 text-white font-medium transition"
            >
              {loopBusy ? 'Running loop…' : 'Run Learning Loop'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Live LLM calls run through the AI Gateway under a hard cost ceiling. A run is roughly {batchSize * 2}{' '}
            conversations (baseline + candidate) plus judging.
          </p>
        </section>

        {error && (
          <div className="p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-200 text-sm">{error}</div>
        )}

        {loopBusy && (
          <div className="p-6 rounded-lg bg-blue-900/20 border border-blue-700 flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full" />
            <span className="text-blue-200 text-sm">
              Running live conversations, judging, and testing significance… this can take a minute.
            </span>
          </div>
        )}

        {/* Loop result */}
        {loop && (
          <section className="space-y-6">
            <div
              className={`p-6 rounded-lg border ${
                loop.adopted ? 'bg-green-900/20 border-green-700' : 'bg-amber-900/20 border-amber-700'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-semibold">
                  {loop.adopted ? 'Candidate adopted' : 'Candidate rejected'}
                </h2>
                <span className="text-sm text-slate-300">
                  cost ${loop.cost.spentUsd.toFixed(4)} / ${loop.cost.ceilingUsd.toFixed(2)} · {loop.cost.calls} calls
                </span>
              </div>
              <p className="text-sm mt-2 text-slate-200">{loop.decision}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricsCard title="Baseline (current prompt)" m={loop.baseline} />
              <MetricsCard title="Candidate (generated)" m={loop.candidate} compareTo={loop.baseline} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Δ Overall" value={`${(loop.improvement * 100).toFixed(1)}%`} good={loop.improvement > 0} />
              <Stat label="p-value" value={loop.pValue.toFixed(3)} good={loop.significant} />
              <Stat label="Significant?" value={loop.significant ? 'Yes' : 'No'} good={loop.significant} />
              <Stat label="Compliance gate" value={loop.meetsCompliance ? 'Pass' : 'Fail'} good={loop.meetsCompliance} />
            </div>

            {loop.weakRules.length > 0 && (
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Weakest rules targeted by the rewrite</h3>
                <div className="flex flex-wrap gap-2">
                  {loop.weakRules.map((r) => (
                    <span key={r} className="px-3 py-1 rounded-full bg-slate-700 text-xs text-slate-200">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <details className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <summary className="cursor-pointer text-sm font-semibold text-slate-300">
                View generated candidate prompt
              </summary>
              <pre className="mt-3 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{loop.newPrompt}</pre>
            </details>

            {/* Meta-evaluation */}
            <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <div>
                  <h2 className="text-xl font-semibold">Darwin-Gödel Meta-Evaluation</h2>
                  <p className="text-sm text-slate-400">
                    Audit the judge that scored the baseline run with an independent, stricter reviewer.
                  </p>
                </div>
                <button
                  onClick={runMeta}
                  disabled={metaBusy}
                  className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-teal-900 disabled:text-slate-400 text-white font-medium transition"
                >
                  {metaBusy ? 'Auditing…' : 'Run Meta-Evaluation'}
                </button>
              </div>

              {meta && (
                <div className="space-y-4 mt-4">
                  <div
                    className={`p-4 rounded-lg border ${
                      meta.adopted ? 'bg-teal-900/20 border-teal-700' : 'bg-slate-900/40 border-slate-700'
                    }`}
                  >
                    <p className="text-sm text-slate-200">{meta.reasoning}</p>
                    {meta.adopted && meta.recomputedOverall !== null && (
                      <p className="text-sm mt-2">
                        Overall corrected:{' '}
                        <span className="text-amber-300 font-semibold">{meta.originalOverall.toFixed(3)}</span>
                        {' → '}
                        <span className="text-teal-300 font-semibold">{meta.recomputedOverall.toFixed(3)}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Stat label="Sampled" value={String(meta.sampled)} />
                    <Stat label="Disagreements" value={String(meta.disagreements.length)} good={meta.disagreements.length === 0} />
                    <Stat label="Mean compliance gap" value={`${meta.meanAbsComplianceGap.toFixed(1)} pts`} />
                  </div>

                  {meta.methodologyChange && (
                    <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-700">
                      <h3 className="text-sm font-semibold text-slate-300 mb-1">Adopted methodology change</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{meta.methodologyChange}</p>
                    </div>
                  )}

                  {meta.disagreements.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-400 border-b border-slate-700">
                            <th className="py-2 pr-4">Persona</th>
                            <th className="py-2 pr-4">Judge</th>
                            <th className="py-2 pr-4">Meta</th>
                            <th className="py-2 pr-4">Gap</th>
                            <th className="py-2">Blindspot</th>
                          </tr>
                        </thead>
                        <tbody>
                          {meta.disagreements.map((d, i) => (
                            <tr key={i} className="border-b border-slate-800">
                              <td className="py-2 pr-4">{d.persona}</td>
                              <td className="py-2 pr-4">{d.judgeValue.toFixed(0)}</td>
                              <td className="py-2 pr-4 text-amber-300">{d.metaValue.toFixed(0)}</td>
                              <td className="py-2 pr-4">{d.magnitude.toFixed(0)}</td>
                              <td className="py-2 text-slate-400">{d.blindspot}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Evolution report */}
        {report && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Evolution Report</h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Stat label="Eval runs" value={String(report.summary.totalRuns)} />
              <Stat label="Variants" value={String(report.summary.totalVariants)} />
              <Stat label="Adopted" value={String(report.summary.adoptedVariants)} good={report.summary.adoptedVariants > 0} />
              <Stat label="Meta revisions" value={String(report.summary.metaRevisions)} />
              <Stat label="Meta adopted" value={String(report.summary.adoptedMetaRevisions)} />
              <Stat label="Total cost" value={`$${report.summary.totalCostUsd.toFixed(2)}`} />
            </div>

            {report.variants.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50">
                    <tr className="text-left text-slate-400">
                      <th className="py-3 px-4">Agent</th>
                      <th className="py-3 px-4">v</th>
                      <th className="py-3 px-4">Δ Overall</th>
                      <th className="py-3 px-4">p</th>
                      <th className="py-3 px-4">Compliance</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.variants.map((v: any) => (
                      <tr key={v.id} className="border-t border-slate-800">
                        <td className="py-2.5 px-4">{v.agent_name}</td>
                        <td className="py-2.5 px-4">{v.version}</td>
                        <td className="py-2.5 px-4">
                          {v.improvement != null ? `${(Number(v.improvement) * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-2.5 px-4">{v.p_value != null ? Number(v.p_value).toFixed(3) : '—'}</td>
                        <td className="py-2.5 px-4">{v.meets_compliance ? 'pass' : 'fail'}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              v.adopted
                                ? 'bg-green-900/40 text-green-300'
                                : v.status === 'testing'
                                  ? 'bg-blue-900/40 text-blue-300'
                                  : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function MetricsCard({ title, m, compareTo }: { title: string; m: PublicMetrics; compareTo?: PublicMetrics }) {
  const rows: { label: string; value: string; delta?: number }[] = [
    { label: 'Overall', value: m.avgOverall.toFixed(3), delta: compareTo ? m.avgOverall - compareTo.avgOverall : undefined },
    {
      label: 'Compliance',
      value: `${m.complianceRate.toFixed(1)}/100`,
      delta: compareTo ? m.complianceRate - compareTo.complianceRate : undefined,
    },
    {
      label: 'Resolution',
      value: `${(m.resolutionRate * 100).toFixed(0)}%`,
      delta: compareTo ? m.resolutionRate - compareTo.resolutionRate : undefined,
    },
    {
      label: 'Efficiency',
      value: `${(m.avgEfficiency * 100).toFixed(0)}%`,
      delta: compareTo ? m.avgEfficiency - compareTo.avgEfficiency : undefined,
    },
    {
      label: 'Sentiment',
      value: m.avgSentiment.toFixed(2),
      delta: compareTo ? m.avgSentiment - compareTo.avgSentiment : undefined,
    },
  ]
  return (
    <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-slate-500">{m.numConversations} convos</span>
      </div>
      <dl className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between">
            <dt className="text-sm text-slate-400">{r.label}</dt>
            <dd className="text-sm font-medium flex items-center gap-2">
              {r.value}
              {r.delta != null && Math.abs(r.delta) > 0.0001 && (
                <span className={r.delta > 0 ? 'text-green-400 text-xs' : 'text-red-400 text-xs'}>
                  {r.delta > 0 ? '▲' : '▼'}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${good === undefined ? 'text-white' : good ? 'text-green-400' : 'text-amber-400'}`}>
        {value}
      </div>
    </div>
  )
}
