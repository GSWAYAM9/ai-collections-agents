'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CreateCasePage() {
  const [formData, setFormData] = useState({
    borrowerName: '',
    phoneNumber: '+91',
    debtAmount: '',
    debtAgeDays: '90',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setStreaming(true);
    setStreamedResponse('');

    try {
      const response = await fetch('/api/cases/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerName: formData.borrowerName,
          phoneNumber: formData.phoneNumber,
          debtAmount: parseFloat(formData.debtAmount),
          debtAgeDays: parseInt(formData.debtAgeDays),
          stream: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create case');
        setStreaming(false);
        setLoading(false);
        return;
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk') {
                setStreamedResponse((prev) => prev + data.content);
              } else if (data.type === 'complete') {
                setResult(data);
                setFormData({
                  borrowerName: '',
                  phoneNumber: '+1-',
                  debtAmount: '',
                  debtAgeDays: '90',
                });
              }
            } catch (e) {
              // Parse error, skip
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setStreaming(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white hover:text-slate-300">
            Collections AI
          </Link>
          <div className="space-x-4">
            <Link
              href="/cases/start"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition text-sm"
            >
              Create Case
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition text-sm"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Create New Collection Case</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Borrower Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Borrower Name
              </label>
              <input
                type="text"
                value={formData.borrowerName}
                onChange={(e) =>
                  setFormData({ ...formData, borrowerName: e.target.value })
                }
                placeholder="John Smith"
                className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                placeholder="+1-555-0123"
                className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Debt Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Debt Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.debtAmount}
                onChange={(e) =>
                  setFormData({ ...formData, debtAmount: e.target.value })
                }
                placeholder="1500.00"
                className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Debt Age */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Debt Age (Days)
              </label>
              <input
                type="number"
                value={formData.debtAgeDays}
                onChange={(e) =>
                  setFormData({ ...formData, debtAgeDays: e.target.value })
                }
                placeholder="90"
                className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                loading
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              }`}
            >
              {loading ? 'Creating Case...' : 'Start Collection Case'}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-200">
              <p className="text-sm font-semibold">Error: {error}</p>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="mt-6 p-6 rounded-lg bg-green-900/30 border border-green-700 space-y-4">
              <p className="text-green-200 font-semibold">✓ Case Created Successfully!</p>
              
              <div className="space-y-2 text-sm text-green-100">
                <p><strong>Case ID:</strong> {result.case.id}</p>
                <p><strong>Borrower:</strong> {result.borrower.name}</p>
                <p><strong>Phone:</strong> {result.borrower.phone}</p>
                <p><strong>Status:</strong> {result.case.status}</p>
                <p><strong>Tokens Used:</strong> {result.metrics?.inputTokens || 0} input, {result.metrics?.outputTokens || 0} output</p>
                <p><strong>Cost:</strong> ${result.metrics?.cost || '0.00'}</p>
              </div>

              <div className="pt-4 border-t border-green-700">
                <p className="text-sm font-semibold text-green-300 mb-2">Assessment Agent Response:</p>
                <div className="text-green-100 text-sm bg-slate-900/50 p-3 rounded max-h-48 overflow-y-auto">
                  {streaming ? (
                    <div className="space-y-2">
                      <p className="animate-pulse text-slate-400">Streaming response...</p>
                      <p>{streamedResponse}</p>
                    </div>
                  ) : (
                    <p>{streamedResponse || result.firstAgentResponse}</p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <Link
                  href="/dashboard"
                  className="flex-1 text-center px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition text-sm font-medium"
                >
                  View in Dashboard
                </Link>
                <Link
                  href={`/cases/${result.case.id}`}
                  className="flex-1 text-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition text-sm font-medium"
                >
                  View Details
                </Link>
              </div>
            </div>
          )}

          {/* Streaming Response */}
          {streaming && (
            <div className="mt-6 p-6 rounded-lg bg-blue-900/30 border border-blue-700">
              <p className="text-blue-200 font-semibold mb-3">Assessment Agent is analyzing...</p>
              <div className="text-blue-100 text-sm bg-slate-900/50 p-3 rounded min-h-24">
                {streamedResponse ? (
                  streamedResponse
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                    <span className="text-slate-400">Streaming response from Claude...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Step 1: Create Case</h3>
            <p className="text-slate-300 text-sm">
              Enter borrower details and debt information. The system will create a new case and begin the collection workflow.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Step 2: Assessment</h3>
            <p className="text-slate-300 text-sm">
              The Assessment Agent uses Claude AI to understand the borrower's situation and gather initial information.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Step 3: Resolution</h3>
            <p className="text-slate-300 text-sm">
              The Resolution Agent takes over via voice call to negotiate payment terms with the borrower.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
