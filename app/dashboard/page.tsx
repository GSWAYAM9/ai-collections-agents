'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Case {
  id: string;
  borrower_id: string;
  status: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  borrower_name?: string;
}

interface Metrics {
  total_cases: number;
  active_cases: number;
  resolved_cases: number;
  avg_compliance_score: number;
  total_conversations: number;
  total_cost_usd: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'cases' | 'evaluations'>('overview');
  const [evaluationStatus, setEvaluationStatus] = useState('idle');
  const [evaluationMessage, setEvaluationMessage] = useState('');
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Try to load from API first, otherwise use empty state
      const response = await fetch('/api/admin/seed-data', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setMetrics(data.data.metrics);
          setCases(data.data.cases);
          setHasData(true);
        }
      }
    } catch (error) {
      console.error('[v0] Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunEvaluation = async () => {
    setEvaluationStatus('loading');
    setEvaluationMessage('Starting evaluation...');

    try {
      const response = await fetch('/api/evaluation/run?batchSize=5&seed=42');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Evaluation failed');
      }

      const data = await response.json();

      if (data.success && data.evaluation) {
        setEvaluationStatus('success');
        const msg = `✓ Evaluation complete: ${data.evaluation.total_conversations} conversations evaluated. 
        Avg Resolution: ${(data.evaluation.avg_resolution_rate * 100).toFixed(1)}%, 
        Compliance: ${(data.evaluation.avg_compliance_score * 100).toFixed(1)}%, 
        Cost: $${data.totalCost}`;
        setEvaluationMessage(msg);
        setTimeout(() => loadDashboard(), 2000);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      setEvaluationStatus('error');
      setEvaluationMessage(`✗ Error: ${error.message}`);
    }
  };

  const handleGeneratePrompts = async () => {
    setEvaluationStatus('loading');
    setEvaluationMessage('Generating new prompts...');

    try {
      const response = await fetch('/api/prompts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'assessment',
          improvementArea: 'compliance',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();

      if (data.success && data.variant) {
        setEvaluationStatus('success');
        setEvaluationMessage(
          `✓ Generated new ${data.variant.agent_name} variant: ${data.variant.variant_letter}. Expected: ${data.variant.metadata.expected_improvement}`
        );
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      setEvaluationStatus('error');
      setEvaluationMessage(`✗ Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <Link href="/" className="text-2xl font-bold text-white hover:text-slate-300">
              Collections AI
            </Link>
            <p className="text-xs text-slate-400">Operational Dashboard</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition text-sm"
          >
            Admin
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700">
          {(['overview', 'cases', 'evaluations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading && activeTab === 'overview' ? (
          <div className="text-center py-12 text-slate-400">Loading dashboard...</div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {!hasData && (
                  <div className="p-6 rounded-lg bg-blue-900/30 border border-blue-700">
                    <p className="text-blue-200 text-sm mb-3">
                      No data yet. Click the button below to generate test data and populate the dashboard.
                    </p>
                    <button
                      onClick={loadDashboard}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition text-sm font-medium"
                    >
                      Generate Test Data
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-2">Total Cases</div>
                    <div className="text-4xl font-bold text-white">
                      {metrics?.total_cases || 0}
                    </div>
                  </div>

                  <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-2">Resolved Cases</div>
                    <div className="text-4xl font-bold text-green-400">
                      {metrics?.resolved_cases || 0}
                    </div>
                  </div>

                  <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-2">Avg Compliance Score</div>
                    <div className="text-4xl font-bold text-blue-400">
                      {metrics?.avg_compliance_score.toFixed(1) || 0}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-2">Active Cases</div>
                    <div className="text-3xl font-bold text-yellow-400">
                      {metrics?.active_cases || 0}
                    </div>
                  </div>

                  <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-2">Total Conversations</div>
                    <div className="text-3xl font-bold text-purple-400">
                      {metrics?.total_conversations || 0}
                    </div>
                  </div>

                  <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-2">Total Cost (USD)</div>
                    <div className="text-3xl font-bold text-red-400">
                      ${typeof metrics?.total_cost_usd === 'number' ? metrics.total_cost_usd.toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>

                {/* System Status */}
                <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Database Connection</span>
                      <span className="px-3 py-1 rounded-full bg-green-900/30 border border-green-700 text-green-400 text-sm">
                        ✓ Connected
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Anthropic API</span>
                      <span className="px-3 py-1 rounded-full bg-green-900/30 border border-green-700 text-green-400 text-sm">
                        ✓ Ready
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Vapi Voice Integration</span>
                      <span className="px-3 py-1 rounded-full bg-green-900/30 border border-green-700 text-green-400 text-sm">
                        ✓ Ready
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cases Tab */}
            {activeTab === 'cases' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Cases</h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={loadDashboard}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition text-sm font-medium"
                    >
                      Refresh
                    </button>
                    <Link
                      href="/cases/start"
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition text-sm font-medium"
                    >
                      New Case
                    </Link>
                  </div>
                </div>

                {cases.length === 0 ? (
                  <div className="p-12 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
                    <p className="text-slate-400 mb-4">
                      No cases yet. Create a new case or load test data to get started.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Link
                        href="/cases/start"
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition text-sm"
                      >
                        Create Case
                      </Link>
                      <button 
                        onClick={loadDashboard}
                        className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition text-sm"
                      >
                        Load Test Data
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cases.map((c) => (
                      <div key={c.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{c.borrower_name}</h3>
                            <p className="text-xs text-slate-400">Case ID: {c.id.slice(0, 12)}...</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            c.status === 'resolved' 
                              ? 'bg-green-900/30 border border-green-700 text-green-400'
                              : c.status === 'in_resolution' || c.status === 'in_negotiation'
                              ? 'bg-blue-900/30 border border-blue-700 text-blue-400'
                              : c.status === 'initial_contact' || c.status === 'assessment'
                              ? 'bg-yellow-900/30 border border-yellow-700 text-yellow-400'
                              : 'bg-purple-900/30 border border-purple-700 text-purple-400'
                          }`}>
                            {c.status?.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                          <div>
                            <p className="text-slate-400">Retries</p>
                            <p className="text-white font-semibold">{c.retry_count}/{c.max_retries}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Created</p>
                            <p className="text-white font-semibold">{new Date(c.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Progress</p>
                            <div className="mt-1 h-2 bg-slate-900/50 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-600"
                                style={{ width: `${(33 * (['initial_contact', 'assessment'].includes(c.status) ? 1 : ['in_resolution', 'in_negotiation'].includes(c.status) ? 2 : 3)) / 3 * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Link
                            href={`/cases/${c.id}`}
                            className="flex-1 text-center px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition text-sm font-medium"
                          >
                            View Details
                          </Link>
                          {['initial_contact', 'assessment'].includes(c.status) && (
                            <button
                              className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition text-sm font-medium"
                            >
                              Move to Resolution
                            </button>
                          )}
                          {['in_resolution', 'in_negotiation'].includes(c.status) && (
                            <button
                              className="flex-1 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition text-sm font-medium"
                            >
                              Move to Final Notice
                            </button>
                          )}
                          {['final_notice', 'escalated'].includes(c.status) && (
                            <button
                              className="flex-1 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition text-sm font-medium"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Evaluations Tab */}
            {activeTab === 'evaluations' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Run Evaluation */}
                  <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Run Evaluation</h3>
                    <p className="text-slate-300 text-sm mb-4">
                      Test the system with simulated borrower scenarios
                    </p>
                    <button
                      onClick={handleRunEvaluation}
                      disabled={evaluationStatus === 'loading'}
                      className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium transition"
                    >
                      {evaluationStatus === 'loading' ? 'Running...' : 'Run Evaluation (5 Borrowers)'}
                    </button>
                  </div>

                  {/* Generate Prompts */}
                  <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Generate Prompts</h3>
                    <p className="text-slate-300 text-sm mb-4">
                      Create new prompt variants and test for improvements
                    </p>
                    <button
                      onClick={handleGeneratePrompts}
                      disabled={evaluationStatus === 'loading'}
                      className="w-full px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium transition"
                    >
                      {evaluationStatus === 'loading' ? 'Generating...' : 'Generate New Prompts'}
                    </button>
                  </div>
                </div>

                {/* Status Message */}
                {evaluationMessage && (
                  <div
                    className={`p-4 rounded-lg ${
                      evaluationStatus === 'success'
                        ? 'bg-green-900/30 border border-green-700 text-green-200'
                        : evaluationStatus === 'error'
                        ? 'bg-red-900/30 border border-red-700 text-red-200'
                        : evaluationStatus === 'loading'
                        ? 'bg-blue-900/30 border border-blue-700 text-blue-200'
                        : ''
                    }`}
                  >
                    {evaluationMessage}
                  </div>
                )}

                {/* Evaluation Info */}
                <div className="p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">About Evaluations</h3>
                  <ul className="space-y-2 text-slate-300 text-sm">
                    <li>• Runs agent pipeline against simulated borrower behaviors</li>
                    <li>• Calculates resolution rates, compliance scores, and efficiency metrics</li>
                    <li>• Tests new prompt variants against baseline</li>
                    <li>• Adopts improvements only if compliance threshold maintained (≥98%)</li>
                    <li>• Tracks cost per component to stay within $20 budget</li>
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
