'use client'

import { useState } from 'react'
import Link from 'next/link'

interface StepRecord {
  step: string
  attempts: number
  compliance: number
  resolutionAchieved: boolean
  variantVersion: number | 'baseline'
}

interface WorkflowEvent {
  id: string
  step: string
  event_type: string
  attempt: number
  details: Record<string, any>
  created_at: string
}

interface WorkflowResult {
  workflowId: string
  state: {
    outcome: string | null
    completedSteps: StepRecord[]
  }
  events: WorkflowEvent[]
}

const PERSONAS = [
  { id: 'hostile', label: 'Hostile / defensive' },
  { id: 'cooperative', label: 'Cooperative' },
  { id: 'hardship', label: 'Financial hardship' },
  { id: 'disputes', label: 'Disputes the debt' },
  { id: 'confused', label: 'Confused / vulnerable' },
]

const EVENT_STYLES: Record<string, string> = {
  started: 'bg-blue-900/40 text-blue-300',
  resumed: 'bg-indigo-900/40 text-indigo-300',
  step_started: 'bg-slate-700 text-slate-300',
  step_completed: 'bg-green-900/40 text-green-300',
  step_failed: 'bg-red-900/40 text-red-300',
  retry_scheduled: 'bg-amber-900/40 text-amber-300',
  completed: 'bg-green-900/50 text-green-200',
  failed: 'bg-red-900/50 text-red-200',
}

export default function OrchestratorPage() {
  const [persona, setPersona] = useState('hostile')
  const [simulateFailure, setSimulateFailure] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resumeBusy, setResumeBusy] = useState(false)
  const [result, setResult] = useState<WorkflowResult | null>(null)
  const [error, setError] = useState('')

  const start = async () => {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/orchestrator/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: persona,
          maxTurnsPerStep: 3,
          costCeilingUsd: 1,
          simulateFailureOnStep: simulateFailure ? 'resolution' : undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Workflow failed')
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const resume = async () => {
    if (!result) return
    setResumeBusy(true)
    setError('')
    try {
      const res = await fetch('/api/orchestrator/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: result.workflowId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Resume failed')
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setResumeBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <Link href="/" className="text-2xl font-bold hover:text-slate-300">
              Collections AI
            </Link>
            <p className="text-xs text-slate-400">Durable Orchestrator</p>
          </div>
          <div className="flex gap-2">
            <Link href="/learning" className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm">
              Learning Lab
            </Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-balance">Durable Collections Workflow</h1>
          <p className="text-slate-400 max-w-3xl text-pretty">
            A resumable, Supabase-persisted state machine runs the three-agent pipeline (assessment → resolution →
            final notice). Each step uses the currently <em>adopted</em> prompt variant from the learning loop, retries
            with exponential backoff on failure, and writes an immutable event to the audit trail. Because progress is
            checkpointed after every step, an interrupted workflow can be resumed exactly where it left off.
          </p>
        </header>

        <section className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Borrower persona</label>
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm"
              >
                {PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="h-4 w-4"
              />
              Inject a transient failure on the resolution step (demonstrates retry + backoff)
            </label>
            <button
              onClick={start}
              disabled={busy || resumeBusy}
              className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:text-slate-400 text-white font-medium transition"
            >
              {busy ? 'Running workflow…' : 'Start Durable Workflow'}
            </button>
          </div>
        </section>

        {error && (
          <div className="p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-200 text-sm">{error}</div>
        )}

        {busy && (
          <div className="p-6 rounded-lg bg-blue-900/20 border border-blue-700 flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full" />
            <span className="text-blue-200 text-sm">Executing pipeline with live agents…</span>
          </div>
        )}

        {result && (
          <section className="space-y-6">
            <div
              className={`p-6 rounded-lg border ${
                result.state.outcome === 'failed'
                  ? 'bg-red-900/20 border-red-700'
                  : 'bg-green-900/20 border-green-700'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-semibold">
                  Outcome: <span className="capitalize">{result.state.outcome ?? 'unknown'}</span>
                </h2>
                <div className="flex items-center gap-3">
                  <code className="text-xs text-slate-400">{result.workflowId.slice(0, 8)}…</code>
                  {result.state.outcome === 'failed' && (
                    <button
                      onClick={resume}
                      disabled={resumeBusy}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 text-white text-sm font-medium transition"
                    >
                      {resumeBusy ? 'Resuming…' : 'Resume Workflow'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {result.state.completedSteps.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.state.completedSteps.map((s) => (
                  <div key={s.step} className="p-5 rounded-lg bg-slate-800/50 border border-slate-700">
                    <h3 className="font-semibold capitalize mb-2">{s.step.replace('_', ' ')}</h3>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Attempts</dt>
                        <dd className={s.attempts > 1 ? 'text-amber-300' : ''}>{s.attempts}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Compliance</dt>
                        <dd>{s.compliance.toFixed(1)}/100</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Resolved</dt>
                        <dd>{s.resolutionAchieved ? 'Yes' : 'No'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Prompt</dt>
                        <dd>{s.variantVersion === 'baseline' ? 'baseline' : `v${s.variantVersion}`}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold mb-3">Event Audit Trail ({result.events.length})</h2>
              <div className="rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50">
                    <tr className="text-left text-slate-400">
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">Step</th>
                      <th className="py-2.5 px-4">Event</th>
                      <th className="py-2.5 px-4">Attempt</th>
                      <th className="py-2.5 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.events.map((e, i) => (
                      <tr key={e.id} className="border-t border-slate-800">
                        <td className="py-2 px-4 text-slate-500">{i + 1}</td>
                        <td className="py-2 px-4 capitalize">{e.step.replace('_', ' ')}</td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${EVENT_STYLES[e.event_type] ?? 'bg-slate-700 text-slate-300'}`}>
                            {e.event_type}
                          </span>
                        </td>
                        <td className="py-2 px-4">{e.attempt}</td>
                        <td className="py-2 px-4 text-slate-400 text-xs">
                          {Object.keys(e.details ?? {}).length > 0 ? JSON.stringify(e.details) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
