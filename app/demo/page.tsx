'use client';

import { useState } from 'react';

export default function DemoPage() {
  const [anthropicTest, setAnthropicTest] = useState('idle');
  const [anthropicResult, setAnthropicResult] = useState('');
  const [vapiTest, setVapiTest] = useState('idle');
  const [vapiResult, setVapiResult] = useState('');
  const [borrowerMessage, setBorrowerMessage] = useState('I lost my job 6 months ago and am struggling to pay back my debt.');

  const testAnthropicAPI = async () => {
    setAnthropicTest('loading');
    setAnthropicResult('Testing Claude API...');

    try {
      const response = await fetch('/api/demo/test-anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerMessage,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAnthropicTest('success');
        setAnthropicResult(
          `✓ Success!\n\nAssessment Agent Response:\n${data.response}\n\nTokens Used: ${data.inputTokens} in, ${data.outputTokens} out\nCost: $${data.cost}`
        );
      } else {
        setAnthropicTest('error');
        setAnthropicResult(`✗ Error: ${data.error}`);
      }
    } catch (error: any) {
      setAnthropicTest('error');
      setAnthropicResult(`✗ Failed: ${error.message}`);
    }
  };

  const testVapiAPI = async () => {
    setVapiTest('loading');
    setVapiResult('Testing Vapi API...');

    try {
      const response = await fetch('/api/demo/test-vapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '+15550123456',
          borrowerName: 'John Doe',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setVapiTest('success');
        setVapiResult(
          `✓ Vapi Call Initiated!\n\nCall ID: ${data.callId}\nStatus: ${data.status}\nPhone: ${data.phoneNumber}\n\nThe voice agent will contact the borrower and conduct a negotiation conversation.`
        );
      } else {
        setVapiTest('error');
        setVapiResult(`✗ Error: ${data.error}\n\nDetails: ${data.details || ''}`);
      }
    } catch (error: any) {
      setVapiTest('error');
      setVapiResult(`✗ Failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">API Integration Demo</h1>
          <p className="text-slate-300">Test Anthropic Claude and Vapi voice agent APIs</p>
        </div>

        {/* Navigation */}
        <div className="mb-8 flex gap-4">
          <a
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
          >
            ← Back to Dashboard
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Anthropic Claude Test */}
          <div className="border border-slate-700 rounded-lg p-6 bg-slate-900/50">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🤖</span>
              <h2 className="text-2xl font-bold text-white">Anthropic Claude API</h2>
            </div>

            <p className="text-slate-400 text-sm mb-4">
              Test the Assessment Agent using Claude 3.5 Sonnet. This simulates a borrower message and gets an AI response with token tracking and cost calculation.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Borrower Message:</label>
                <textarea
                  value={borrowerMessage}
                  onChange={(e) => setBorrowerMessage(e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
                  rows={4}
                />
              </div>

              <button
                onClick={testAnthropicAPI}
                disabled={anthropicTest === 'loading'}
                className={`w-full px-4 py-3 rounded-lg font-medium transition ${
                  anthropicTest === 'loading'
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                }`}
              >
                {anthropicTest === 'loading' ? 'Testing...' : 'Test Anthropic API'}
              </button>

              {anthropicResult && (
                <div
                  className={`p-4 rounded-lg text-sm font-mono whitespace-pre-wrap break-words ${
                    anthropicTest === 'success'
                      ? 'bg-green-900/30 border border-green-700 text-green-200'
                      : anthropicTest === 'error'
                      ? 'bg-red-900/30 border border-red-700 text-red-200'
                      : 'bg-blue-900/30 border border-blue-700 text-blue-200'
                  }`}
                >
                  {anthropicResult}
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-200 mb-2">What happens:</h3>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li>Your message is sent to Assessment Agent</li>
                <li>Claude analyzes borrower situation with FDCPA compliance</li>
                <li>Agent generates empathetic, compliant response</li>
                <li>Token usage tracked and cost calculated</li>
              </ul>
            </div>
          </div>

          {/* Vapi Voice Test */}
          <div className="border border-slate-700 rounded-lg p-6 bg-slate-900/50">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📞</span>
              <h2 className="text-2xl font-bold text-white">Vapi Voice Agent API</h2>
            </div>

            <p className="text-slate-400 text-sm mb-4">
              Test the Resolution Agent voice integration. Vapi handles the live voice call, negotiation, and call recording.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Phone Number:</label>
                <input
                  type="tel"
                  defaultValue="+1-555-0123"
                  className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
                  placeholder="+1-555-0123"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Borrower Name:</label>
                <input
                  type="text"
                  defaultValue="John Doe"
                  className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm"
                  placeholder="John Doe"
                />
              </div>

              <button
                onClick={testVapiAPI}
                disabled={vapiTest === 'loading'}
                className={`w-full px-4 py-3 rounded-lg font-medium transition ${
                  vapiTest === 'loading'
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                }`}
              >
                {vapiTest === 'loading' ? 'Initiating...' : 'Test Vapi Voice Agent'}
              </button>

              {vapiResult && (
                <div
                  className={`p-4 rounded-lg text-sm font-mono whitespace-pre-wrap break-words ${
                    vapiTest === 'success'
                      ? 'bg-green-900/30 border border-green-700 text-green-200'
                      : vapiTest === 'error'
                      ? 'bg-red-900/30 border border-red-700 text-red-200'
                      : 'bg-blue-900/30 border border-blue-700 text-blue-200'
                  }`}
                >
                  {vapiResult}
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-200 mb-2">What happens:</h3>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li>Vapi initiates a live voice call to borrower</li>
                <li>Resolution Agent handles negotiation via speech</li>
                <li>Call is recorded and transcribed automatically</li>
                <li>Results stored for evaluation and improvement</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Integration Info */}
        <div className="mt-12 border border-slate-700 rounded-lg p-8 bg-slate-900/50">
          <h2 className="text-2xl font-bold text-white mb-6">How These APIs Are Used</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-blue-400 mb-3">Anthropic Claude</h3>
              <div className="space-y-3 text-slate-300 text-sm">
                <p>
                  <strong>Assessment Agent:</strong> Analyzes borrower situation, builds rapport, gathers financial info
                </p>
                <p>
                  <strong>Resolution Agent:</strong> Generates negotiation strategies and payment arrangements
                </p>
                <p>
                  <strong>Final Notice Agent:</strong> Composes formal legal notices while maintaining compliance
                </p>
                <p>
                  <strong>Prompt Generator:</strong> Creates new prompt variants for continuous improvement
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-3">Vapi Voice Agent</h3>
              <div className="space-y-3 text-slate-300 text-sm">
                <p>
                  <strong>Voice Calls:</strong> Handles live phone conversations with borrowers
                </p>
                <p>
                  <strong>Speech-to-Text:</strong> Transcribes borrower responses in real-time
                </p>
                <p>
                  <strong>Text-to-Speech:</strong> Generates natural voice responses from agent
                </p>
                <p>
                  <strong>Recording:</strong> Captures all conversations for compliance and evaluation
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
