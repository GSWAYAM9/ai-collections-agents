'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';

export default function CaseDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const caseId = params.id as string;
  const action = searchParams.get('action') || null;
  
  const [caseData, setCaseData] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAgent, setActiveAgent] = useState<'assessment' | 'resolution' | 'final_notice'>('assessment');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [voiceCallActive, setVoiceCallActive] = useState(false);
  const [voiceCallId, setVoiceCallId] = useState<string | null>(null);
  const [voiceCallStatus, setVoiceCallStatus] = useState<string>('idle');
  const [voiceCallDuration, setVoiceCallDuration] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');

  useEffect(() => {
    loadCaseDetails();
    if (action) {
      // Perform action if passed via URL
      handleAction(action);
    }
  }, [caseId, action]);

  const loadCaseDetails = async () => {
    try {
      // In a real app, fetch from API
      // For now, show placeholder with realistic data
      setCaseData({
        id: caseId,
        borrower_name: 'John Martinez',
        phone: '+1-555-0101',
        email: 'john@example.com',
        status: 'in_assessment',
        debt_amount: 2500,
        debt_age: 120,
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
          created_at: new Date().toISOString(),
          messages: [
            { role: 'user', content: 'Hello?' },
            { role: 'assistant', content: 'Hello, I\'m calling about a debt of $2,500.00 that you may owe. Could you help me understand your current financial situation?' },
          ],
        },
      ]);
    } catch (error) {
      console.error('[v0] Error loading case:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (actionType: string) => {
    switch (actionType) {
      case 'assess':
        setActiveAgent('assessment');
        break;
      case 'negotiate':
        setActiveAgent('resolution');
        break;
      case 'final_notice':
        setActiveAgent('final_notice');
        break;
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setSending(true);
    try {
      // Add user message to conversation
      setConversations(prev => prev.map((conv, idx) => 
        idx === 0 
          ? { ...conv, messages: [...conv.messages, { role: 'user', content: message }] }
          : conv
      ));
      
      setMessage('');
      
      // Simulate agent response
      setTimeout(() => {
        setConversations(prev => prev.map((conv, idx) => 
          idx === 0 
            ? { ...conv, messages: [...conv.messages, { role: 'assistant', content: 'I understand your situation. Would you be interested in discussing a payment plan?' }] }
            : conv
        ));
      }, 1000);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setCaseData(prev => ({ ...prev, status: newStatus }));
  };

  const initiateVoiceCall = async () => {
    try {
      setVoiceCallStatus('initiating');
      setVoiceCallActive(true);

      const response = await fetch('/api/voice/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseId,
          borrowerData: {
            id: caseData?.id,
            name: caseData?.borrower_name,
            phone: caseData?.phone,
            debtAmount: caseData?.debt_amount,
            debtAgeDays: caseData?.debt_age,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initiate call');
      }

      const data = await response.json();
      setVoiceCallId(data.callId);
      setVoiceCallStatus('ringing');

      // Poll for call status
      startCallStatusPolling(data.callId);
    } catch (error: any) {
      console.error('[v0] Voice call error:', error);
      setVoiceCallStatus('error');
      alert(`Error initiating call: ${error.message}`);
    }
  };

  const startCallStatusPolling = (callId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/voice/status?callId=${callId}`);
        if (!response.ok) {
          clearInterval(pollInterval);
          return;
        }

        const callData = await response.json();
        setVoiceCallStatus(callData.status);
        setVoiceCallDuration(callData.duration || 0);

        if (callData.transcript) {
          setVoiceTranscript(callData.transcript);
        }

        // Stop polling when call ends
        if (callData.status === 'ended') {
          clearInterval(pollInterval);
          setVoiceCallActive(false);
          // Parse transcript and update case
          if (callData.summary) {
            setConversations(prev => [{
              ...prev[0],
              messages: [
                ...prev[0]?.messages || [],
                { role: 'assistant', content: callData.summary }
              ]
            }]);
          }
        }
      } catch (error) {
        console.error('[v0] Error polling call status:', error);
      }
    }, 2000); // Poll every 2 seconds
  };

  const endVoiceCall = async () => {
    if (!voiceCallId) return;

    try {
      const response = await fetch('/api/voice/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: voiceCallId }),
      });

      if (response.ok) {
        setVoiceCallActive(false);
        setVoiceCallStatus('ended');
      }
    } catch (error: any) {
      console.error('[v0] Error ending call:', error);
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
              <h1 className="text-3xl font-bold text-white mb-2">{caseData?.borrower_name}</h1>
              <p className="text-slate-400">Case ID: {caseId.slice(0, 12)}...</p>
              <p className="text-slate-400">Status: <span className="text-yellow-400 font-semibold capitalize">{caseData?.status.replace(/_/g, ' ')}</span></p>
              <p className="text-slate-400">Created: {new Date(caseData?.created_at).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-300 text-sm mb-3">Retries: {caseData?.retry_count}/{caseData?.max_retries}</p>
              <button 
                onClick={() => handleStatusChange('resolved')}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition text-sm font-medium"
              >
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>

        {/* Agent Selection Tabs */}
        <div className="flex gap-4 mb-6 flex-wrap">
          {(['assessment', 'resolution', 'final_notice'] as const).map((agent) => (
            <button
              key={agent}
              onClick={() => setActiveAgent(agent)}
              className={`px-6 py-2 rounded-lg transition font-medium capitalize ${
                activeAgent === agent
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              {agent === 'final_notice' ? 'Final Notice' : agent.charAt(0).toUpperCase() + agent.slice(1)}
            </button>
          ))}
          
          {/* Voice Call Button */}
          <button
            onClick={voiceCallActive ? endVoiceCall : initiateVoiceCall}
            disabled={!caseData?.phone}
            className={`px-6 py-2 rounded-lg transition font-medium ${
              voiceCallActive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-slate-700 disabled:text-slate-500'
            }`}
          >
            {voiceCallActive ? `Call Active (${Math.floor(voiceCallDuration)}s)` : '📞 Start Voice Call'}
          </button>
        </div>

        {/* Voice Call Status Panel */}
        {voiceCallActive && (
          <div className="bg-slate-800/50 border-2 border-green-600 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <div className="animate-pulse w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-white font-semibold">Voice Call in Progress</span>
              </div>
              <span className="text-slate-300 text-sm">Duration: {Math.floor(voiceCallDuration)} seconds</span>
            </div>
            <p className="text-slate-300 text-sm mb-3">Status: <span className="text-green-400 font-semibold capitalize">{voiceCallStatus}</span></p>
            {voiceTranscript && (
              <div className="bg-slate-900/50 rounded p-3 max-h-32 overflow-y-auto">
                <p className="text-slate-200 text-sm"><strong>Live Transcript:</strong></p>
                <p className="text-slate-300 text-sm mt-2">{voiceTranscript.slice(0, 200)}...</p>
              </div>
            )}
            <button
              onClick={endVoiceCall}
              className="mt-3 w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition font-medium"
            >
              End Call
            </button>
          </div>
        )}

        {/* Conversation Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Conversation</h2>
              
              <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
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
              <div className="pt-4 border-t border-slate-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type response or continue conversation..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={sending || !message.trim()}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white transition font-medium"
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Case Info Sidebar */}
          <div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Case Information</h3>
              
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-slate-400">Borrower Name</p>
                  <p className="text-white font-semibold">{caseData?.borrower_name}</p>
                </div>
                
                <div>
                  <p className="text-slate-400">Phone</p>
                  <p className="text-white font-semibold">{caseData?.phone}</p>
                </div>

                <div>
                  <p className="text-slate-400">Email</p>
                  <p className="text-white font-semibold">{caseData?.email || 'Not provided'}</p>
                </div>
                
                <div>
                  <p className="text-slate-400">Debt Amount</p>
                  <p className="text-white font-semibold">${(caseData?.debt_amount / 100).toFixed(2)}</p>
                </div>
                
                <div>
                  <p className="text-slate-400">Debt Age</p>
                  <p className="text-white font-semibold">{caseData?.debt_age} days</p>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <p className="text-slate-400 mb-2">Current Status</p>
                  <p className="text-white font-semibold capitalize">{caseData?.status.replace(/_/g, ' ')}</p>
                </div>

                <div>
                  <p className="text-slate-400 mb-2">Quick Actions</p>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => handleStatusChange('assessment_complete')}
                      className="w-full px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition"
                    >
                      Complete Assessment
                    </button>
                    <button 
                      onClick={() => handleStatusChange('in_negotiation')}
                      className="w-full px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition"
                    >
                      Start Negotiation
                    </button>
                    <button 
                      onClick={() => handleStatusChange('resolved')}
                      className="w-full px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition"
                    >
                      Mark Resolved
                    </button>
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
