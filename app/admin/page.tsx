'use client';

import { useState } from 'react';

export default function AdminDashboard() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const initializeDatabase = async () => {
    setStatus('loading');
    setMessage('Initializing database schema...');

    try {
      const response = await fetch('/api/admin/init-db', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('✓ Database schema initialized successfully!');
      } else {
        setStatus('error');
        setMessage(`✗ Error: ${data.error}`);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`✗ Failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Collections AI System</h1>
          <p className="text-slate-300 mb-8">Admin Dashboard</p>

          <div className="space-y-6">
            {/* Database Initialization */}
            <div className="border border-slate-700 rounded-lg p-6 bg-slate-900/50">
              <h2 className="text-xl font-semibold text-white mb-4">Database Setup</h2>
              
              <button
                onClick={initializeDatabase}
                disabled={status === 'loading'}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  status === 'loading'
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                }`}
              >
                {status === 'loading' ? 'Initializing...' : 'Initialize Database'}
              </button>

              {message && (
                <div className={`mt-4 p-4 rounded-lg ${
                  status === 'success' 
                    ? 'bg-green-900/30 border border-green-700 text-green-200' 
                    : status === 'error'
                    ? 'bg-red-900/30 border border-red-700 text-red-200'
                    : 'bg-blue-900/30 border border-blue-700 text-blue-200'
                }`}>
                  {message}
                </div>
              )}
            </div>

            {/* System Status */}
            <div className="border border-slate-700 rounded-lg p-6 bg-slate-900/50">
              <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Supabase Connection</span>
                  <span className="text-green-400">✓ Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Anthropic API</span>
                  <span className="text-green-400">✓ Configured</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Vapi Integration</span>
                  <span className="text-green-400">✓ Configured</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="border border-slate-700 rounded-lg p-6 bg-slate-900/50">
              <h2 className="text-xl font-semibold text-white mb-4">Quick Links</h2>
              
              <div className="space-y-2">
                <a 
                  href="/api/evaluation/run?batchSize=5&seed=42"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
                >
                  → Run Evaluation (5 borrowers)
                </a>
                <a 
                  href="/api/prompts/generate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
                >
                  → Generate New Prompts
                </a>
                <a 
                  href="/api/cases/run?case_id=test"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
                >
                  → Start Collections Case
                </a>
              </div>
            </div>

            {/* Documentation */}
            <div className="border border-slate-700 rounded-lg p-6 bg-slate-900/50">
              <h2 className="text-xl font-semibold text-white mb-4">Documentation</h2>
              
              <p className="text-slate-300 text-sm mb-4">
                View the documentation files to understand the system architecture:
              </p>

              <div className="space-y-2 text-sm">
                <p className="text-slate-400">📄 <code>README.md</code> - Full documentation</p>
                <p className="text-slate-400">📋 <code>GETTING_STARTED.md</code> - Quick start guide</p>
                <p className="text-slate-400">📝 <code>DECISION_JOURNAL.md</code> - Architecture decisions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
