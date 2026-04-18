'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CaseDetailsPage() {
  const params = useParams();
  const caseId = params.id as string;
  
  const [caseData, setCaseData] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAgent, setActiveAgent] = useState<'assessment' | 'resolution' | 'final_notice'>('assessment');

  useEffect(() => {
    loadCaseDetails();
  }, [caseId]);

  const loadCaseDetails = async () => {
    try {
      // In a real app, fetch from API
      // For now, show placeholder
      setCaseData({
        id: caseId,
        borrower_id: '...',
        status: 'in_assessment',
        retry_count: 0,
        max_retries: 3,
        created_at: new Date().toISOString(),
      });
      setConversations([
        {
          id: '1',
          agent_name: 'assessment',
          medium: 'chat',
          status: 'in_progress',
          messages: [
            { role: 'user', content: 'Hello?' },
            { role: 'assistant', content: 'Hi, this is regarding a debt...' },
          ],
        },
      ]);
    } catch (error) {
      console.error('[v0] Error loading case:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading case details...</p>
        </div>
      </div>
    );
  }

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
              New Case
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

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Case Header */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Case: {caseId.slice(0, 8)}...</h1>
              <p className="text-slate-400">Status: <span className="text-yellow-400 font-semibold">{caseData?.status}</span></p>
              <p className="text-slate-400">Created: {new Date(caseData?.created_at).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-300 text-sm">Retries: {caseData?.retry_count}/{caseData?.max_retries}</p>
              <button className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition text-sm">
                Move to Next Agent
              </button>
            </div>
          </div>
        </div>

        {/* Agent Selection Tabs */}
        <div className="flex gap-4 mb-6">
          {['assessment', 'resolution', 'final_notice'].map((agent) => (
            <button
              key={agent}
              onClick={() => setActiveAgent(agent as any)}
              className={`px-6 py-2 rounded-lg transition font-medium capitalize ${
                activeAgent === agent
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              {agent === 'final_notice' ? 'Final Notice' : agent.charAt(0).toUpperCase() + agent.slice(1)}
            </button>
          ))}
        </div>

        {/* Conversation Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Conversation</h2>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {conversations[0]?.messages?.map((msg: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-900/30 border border-blue-700 ml-8'
                        : 'bg-slate-900/50 border border-slate-600 mr-8'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-300 mb-1">
                      {msg.role === 'user' ? 'Borrower' : 'Agent'}
                    </p>
                    <p className={msg.role === 'user' ? 'text-blue-100' : 'text-slate-200'}>
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="mt-4 pt-4 border-t border-slate-700">
                <input
                  type="text"
                  placeholder="Type agent response..."
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
                <button className="mt-2 w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition font-medium">
                  Send Message
                </button>
              </div>
            </div>
          </div>

          {/* Case Info Sidebar */}
          <div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Case Information</h3>
              
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-slate-400">Borrower</p>
                  <p className="text-white font-semibold">John Smith</p>
                </div>
                
                <div>
                  <p className="text-slate-400">Phone</p>
                  <p className="text-white font-semibold">+1-555-0100</p>
                </div>
                
                <div>
                  <p className="text-slate-400">Debt Amount</p>
                  <p className="text-white font-semibold">$5,000.00</p>
                </div>
                
                <div>
                  <p className="text-slate-400">Debt Age</p>
                  <p className="text-white font-semibold">90 days</p>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <p className="text-slate-400 mb-2">Status History</p>
                  <div className="space-y-1 text-xs">
                    <p className="text-green-400">✓ Assessment - In Progress</p>
                    <p className="text-slate-400">- Resolution - Pending</p>
                    <p className="text-slate-400">- Final Notice - Pending</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
