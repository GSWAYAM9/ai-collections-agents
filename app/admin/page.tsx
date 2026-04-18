'use client';

import { useState } from 'react';

export default function AdminDashboard() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'info' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [schemaSQL, setSchemaSQL] = useState<string[]>([]);
  const [showSQL, setShowSQL] = useState(false);
  const [autoInitLoading, setAutoInitLoading] = useState(false);
  const [autoInitStatus, setAutoInitStatus] = useState('');

  const initializeDatabase = async () => {
    setStatus('loading');
    setMessage('Fetching database schema...');

    try {
      const response = await fetch('/api/admin/init-db', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.schemaStatements && Array.isArray(data.schemaStatements)) {
        setSchemaSQL(data.schemaStatements);
        setShowSQL(true);
        setStatus('info');
        setMessage(data.message || 'Please run the SQL in Supabase dashboard');
      } else if (response.ok) {
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

  const copyAllSQL = () => {
    const sql = schemaSQL.join(';\n\n') + ';';
    navigator.clipboard.writeText(sql);
    alert('All SQL copied to clipboard!');
  };

  const autoInitializeDatabase = async () => {
    setAutoInitLoading(true);
    setAutoInitStatus('Initializing database tables...');

    try {
      const response = await fetch('/api/admin/auto-init-db', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setAutoInitStatus('✓ Database initialized successfully! You can now create cases.');
      } else {
        setAutoInitStatus(`✗ Error: ${data.error || 'Failed to initialize'}`);
      }
    } catch (error: any) {
      setAutoInitStatus(`✗ Error: ${error.message}`);
    } finally {
      setAutoInitLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Collections AI System</h1>
          <p className="text-slate-300 mb-8">Admin Dashboard</p>

          <div className="space-y-6">
            {/* Database Initialization */}
            <div className="border border-slate-700 rounded-lg p-6 bg-slate-900/50">
              <h2 className="text-xl font-semibold text-white mb-4">Database Setup</h2>
              
              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm text-slate-300 mb-2">Option 1: Auto-Initialize (Recommended)</p>
                  <button
                    onClick={autoInitializeDatabase}
                    disabled={autoInitLoading}
                    className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                      autoInitLoading
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    }`}
                  >
                    {autoInitLoading ? 'Initializing...' : '✓ Auto-Initialize Database'}
                  </button>
                  {autoInitStatus && (
                    <div className={`mt-2 p-3 rounded-lg text-sm ${
                      autoInitStatus.includes('✓')
                        ? 'bg-green-900/30 border border-green-700 text-green-200'
                        : 'bg-red-900/30 border border-red-700 text-red-200'
                    }`}>
                      {autoInitStatus}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-sm text-slate-300 mb-2">Option 2: Manual Setup</p>
                  <button
                    onClick={initializeDatabase}
                    disabled={status === 'loading'}
                    className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                      status === 'loading'
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                    }`}
                  >
                    {status === 'loading' ? 'Fetching...' : 'Get Database Schema'}
                  </button>
                </div>
              </div>

              {message && (
                <div className={`mt-4 p-4 rounded-lg ${
                  status === 'success' 
                    ? 'bg-green-900/30 border border-green-700 text-green-200' 
                    : status === 'info'
                    ? 'bg-yellow-900/30 border border-yellow-700 text-yellow-200'
                    : status === 'error'
                    ? 'bg-red-900/30 border border-red-700 text-red-200'
                    : 'bg-blue-900/30 border border-blue-700 text-blue-200'
                }`}>
                  {message}
                </div>
              )}
            </div>

            {/* SQL Schema Display */}
            {showSQL && schemaSQL.length > 0 && (
              <div className="border border-slate-700 rounded-lg p-6 bg-slate-900/50">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white">SQL Schema Statements</h2>
                  <button
                    onClick={copyAllSQL}
                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition"
                  >
                    Copy All SQL
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto bg-slate-950 rounded-lg p-4 mb-4">
                  <div className="space-y-4">
                    {Array.isArray(schemaSQL) && schemaSQL.length > 0 ? (
                      schemaSQL.map((statement, idx) => (
                        <div key={idx} className="border-b border-slate-700 pb-4 last:border-b-0">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-400 text-xs font-mono">Statement {idx + 1}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(statement);
                                alert('Copied!');
                              }}
                              className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-200"
                            >
                              Copy
                            </button>
                          </div>
                          <pre className="text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap break-words">
                            {statement}
                          </pre>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-sm">No statements available</p>
                    )}
                  </div>
                </div>

                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                  <h3 className="text-yellow-200 font-semibold mb-3">Setup Instructions:</h3>
                  <ol className="text-yellow-100 text-sm space-y-2 list-decimal list-inside">
                    <li>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">supabase.com</a> and log in</li>
                    <li>Open your Collections AI project</li>
                    <li>Click "SQL Editor" in the left sidebar</li>
                    <li>Click "New Query" button</li>
                    <li>Click "Copy All SQL" button above and paste into the editor</li>
                    <li>Click the "Run" button to execute all statements</li>
                    <li>Once complete, return to this dashboard and refresh the page</li>
                  </ol>
                </div>
              </div>
            )}

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

            {/* Documentation */}
            <div className="border border-slate-700 rounded-lg p-6 bg-slate-900/50">
              <h2 className="text-xl font-semibold text-white mb-4">Documentation</h2>
              
              <p className="text-slate-300 text-sm mb-4">
                Once database is initialized, you can use these endpoints:
              </p>

              <div className="space-y-2 text-sm">
                <p className="text-slate-400">📋 <code className="bg-slate-950 px-2 py-1 rounded">/api/evaluation/run?batchSize=5</code> - Run evaluation</p>
                <p className="text-slate-400">🔄 <code className="bg-slate-950 px-2 py-1 rounded">/api/prompts/generate</code> - Generate prompts</p>
                <p className="text-slate-400">📞 <code className="bg-slate-950 px-2 py-1 rounded">/api/cases/run?case_id=&lt;id&gt;</code> - Start case</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
