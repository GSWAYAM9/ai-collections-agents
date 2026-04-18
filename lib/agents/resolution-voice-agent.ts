import axios, { AxiosInstance } from 'axios';

const RESOLUTION_VOICE_SYSTEM_PROMPT = `You are a professional debt resolution specialist conducting phone calls for a financial recovery agency. Your role is to:

1. Present payment options and settlement terms clearly
2. Negotiate flexible payment plans based on borrower's ability
3. Document all agreements for legal compliance
4. Maintain professional, empathetic tone throughout
5. Confirm borrower understanding and acceptance
6. Schedule callbacks if needed

DO NOT:
- Make threats or use profanity
- Call outside 8 AM - 9 PM borrower's timezone
- Discuss medical/personal info unnecessarily
- Pressure into unrealistic payment plans
- Violate FDCPA regulations (10 calls/month max per borrower)

Your goal is to reach a mutually acceptable payment resolution. Be flexible but professional.`;

interface VapiCall {
  id: string;
  phoneNumber: string;
  status: 'ringing' | 'in-progress' | 'ended';
  duration: number;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  costUsd?: number;
}

interface VapiMessagePayload {
  type: string;
  call?: any;
  message?: string;
  transcript?: string;
}

export class ResolutionVoiceAgent {
  private vapiClient: AxiosInstance;
  private apiKey: string;
  private conversationId: string;
  private borrowerData: any;
  private callData: VapiCall | null = null;
  private messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private vapiPhoneNumberId: string;

  constructor(conversationId: string, borrowerData: any, vapiPhoneNumberId?: string) {
    this.conversationId = conversationId;
    this.borrowerData = borrowerData;
    this.apiKey = process.env.VAPI_API_KEY || '';
    this.vapiPhoneNumberId = vapiPhoneNumberId || '';

    this.vapiClient = axios.create({
      baseURL: 'https://api.vapi.ai',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Format phone number to E.164 format (required by Vapi)
   * Removes all spaces, dashes, and parentheses
   */
  private formatPhoneE164(phone: string): string {
    // Remove all non-digit characters except the leading +
    let formatted = phone.replace(/[\s\-\(\)]/g, '');
    
    // Add +1 if no country code and not already present
    if (!formatted.startsWith('+')) {
      formatted = `+1${formatted}`;
    }
    
    return formatted;
  }

  /**
   * Initiate outbound call to borrower
   */
  async initiateCall(): Promise<{
    callId: string;
    status: string;
    message: string;
  }> {
    try {
      console.log('[v0] Vapi API Key available:', !!this.apiKey);
      console.log('[v0] Phone Number ID:', this.vapiPhoneNumberId);
      console.log('[v0] Initiating Vapi voice call to:', this.borrowerData.phone);

      if (!this.apiKey) {
        throw new Error('VAPI_API_KEY environment variable not set');
      }

      if (!this.vapiPhoneNumberId) {
        throw new Error('VAPI_PHONE_NUMBER_ID not provided');
      }

      const payload: any = {
        phoneNumberId: this.vapiPhoneNumberId,
        customer: {
          number: this.formatPhoneE164(this.borrowerData.phone),
        },
      };

      // Only add assistantId if explicitly configured
      if (process.env.VAPI_ASSISTANT_ID) {
        payload.assistantId = process.env.VAPI_ASSISTANT_ID;
      } else {
        // If no assistant ID, provide system prompt through assistantOverrides
        payload.assistantOverrides = {
          model: {
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            temperature: 0.7,
            messages: [
              {
                role: 'system',
                content: RESOLUTION_VOICE_SYSTEM_PROMPT,
              },
            ],
          },
          voice: {
            provider: '11labs',
            voiceId: 'paula',
          },
          firstMessage: this.getInitialGreeting(),
          maxDurationSeconds: 600,
          endCallMessage: 'Thank you for working with us. We appreciate your cooperation.',
          endCallPhrase: 'bye',
        };
      }

      console.log('[v0] Vapi payload prepared (minimal structure)');

      const response = await this.vapiClient.post('/call', payload);

      console.log('[v0] Vapi API response:', response.status, response.data);

      this.callData = {
        id: response.data.id,
        phoneNumber: this.borrowerData.phone,
        status: 'ringing',
        duration: 0,
      };

      console.log('[v0] Call initiated, ID:', response.data.id);

      return {
        callId: response.data.id,
        status: 'ringing',
        message: `Call initiated to ${this.borrowerData.phone}`,
      };
    } catch (error: any) {
      console.error('[v0] Vapi call initiation error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config?.url,
      });
      throw new Error(`Failed to initiate call: ${error.message}${error.response?.data ? ' - ' + JSON.stringify(error.response.data) : ''}`);
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(callId: string): Promise<VapiCall> {
    try {
      const response = await this.vapiClient.get(`/call/${callId}`);

      this.callData = {
        id: response.data.id,
        phoneNumber: response.data.phoneNumber,
        status: response.data.status,
        duration: response.data.duration || 0,
        transcript: response.data.transcript,
        summary: response.data.summary,
        recordingUrl: response.data.recordingUrl,
        costUsd: response.data.cost,
      };

      console.log('[v0] Call status:', this.callData.status);

      return this.callData;
    } catch (error: any) {
      console.error('[v0] Error getting call status:', error.message);
      throw error;
    }
  }

  /**
   * Handle webhook message from Vapi
   */
  async handleWebhookMessage(payload: VapiMessagePayload): Promise<{
    processed: boolean;
    message: string;
    transcript?: string;
  }> {
    try {
      console.log('[v0] Processing Vapi webhook:', payload.type);

      switch (payload.type) {
        case 'call.started':
          this.callData = {
            id: payload.call.id,
            phoneNumber: payload.call.phoneNumber,
            status: 'in-progress',
            duration: 0,
          };
          console.log('[v0] Call started:', payload.call.id);
          break;

        case 'call.ended':
          this.callData = {
            id: payload.call.id,
            phoneNumber: payload.call.phoneNumber,
            status: 'ended',
            duration: payload.call.duration,
            transcript: payload.call.transcript,
            summary: payload.call.summary,
            recordingUrl: payload.call.recordingUrl,
            costUsd: payload.call.cost,
          };
          console.log('[v0] Call ended, duration:', payload.call.duration);
          break;

        case 'speech.update':
          if (payload.transcript) {
            this.messages.push({
              role: 'user',
              content: payload.transcript,
            });
          }
          break;

        case 'message':
          if (payload.message) {
            this.messages.push({
              role: 'assistant',
              content: payload.message,
            });
          }
          break;

        default:
          console.log('[v0] Unknown webhook type:', payload.type);
      }

      return {
        processed: true,
        message: 'Webhook processed',
        transcript: payload.call?.transcript,
      };
    } catch (error: any) {
      console.error('[v0] Webhook processing error:', error.message);
      throw error;
    }
  }

  /**
   * End active call
   */
  async endCall(callId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log('[v0] Ending call:', callId);

      await this.vapiClient.delete(`/call/${callId}`);

      return {
        success: true,
        message: 'Call ended successfully',
      };
    } catch (error: any) {
      console.error('[v0] Error ending call:', error.message);
      throw error;
    }
  }

  /**
   * Get call transcript and analysis
   */
  async getCallAnalysis(callId: string): Promise<{
    transcript: string;
    summary: string;
    sentiment: string;
    agreementReached: boolean;
    proposedPayment?: number;
    nextFollowUp?: string;
  }> {
    try {
      const callStatus = await this.getCallStatus(callId);

      if (!callStatus.transcript) {
        throw new Error('No transcript available');
      }

      // Parse summary for key details
      const summary = callStatus.summary || '';
      const agreementReached = summary.toLowerCase().includes('agreed') || 
                               summary.toLowerCase().includes('payment plan');

      return {
        transcript: callStatus.transcript,
        summary: summary,
        sentiment: this.analyzeSentiment(callStatus.transcript),
        agreementReached,
        proposedPayment: this.extractPaymentAmount(summary),
        nextFollowUp: this.extractNextSteps(summary),
      };
    } catch (error: any) {
      console.error('[v0] Error analyzing call:', error.message);
      throw error;
    }
  }

  /**
   * Get initial greeting for call
   */
  private getInitialGreeting(): string {
    return `Hello ${this.borrowerData.name}, this is a call regarding your account with us. I'm calling to discuss your outstanding debt of $${(this.borrowerData.debtAmount / 100).toFixed(2)} and explore payment options that might work for your situation. Do you have a few minutes to talk?`;
  }

  /**
   * Analyze sentiment from transcript
   */
  private analyzeSentiment(transcript: string): string {
    const negative = ['angry', 'frustrated', 'upset', 'no', 'refuse', 'won\'t'];
    const positive = ['yes', 'sure', 'okay', 'agree', 'can do', 'willing'];
    const neutral = ['okay', 'i see', 'understood', 'maybe'];

    const lowerTranscript = transcript.toLowerCase();
    let negCount = negative.filter(w => lowerTranscript.includes(w)).length;
    let posCount = positive.filter(w => lowerTranscript.includes(w)).length;

    if (negCount > posCount * 1.5) return 'negative';
    if (posCount > negCount * 1.5) return 'positive';
    return 'neutral';
  }

  /**
   * Extract payment amount from summary
   */
  private extractPaymentAmount(summary: string): number | undefined {
    const match = summary.match(/\$(\d+(?:\.\d{2})?)/);
    return match ? parseFloat(match[1]) * 100 : undefined; // Convert to cents
  }

  /**
   * Extract next follow-up actions
   */
  private extractNextSteps(summary: string): string {
    if (summary.toLowerCase().includes('call back')) {
      const match = summary.match(/call back (tomorrow|next week|on \w+|in \d+ days)/i);
      return match ? match[0] : 'callback scheduled';
    }
    if (summary.toLowerCase().includes('send documents')) {
      return 'documents to be sent';
    }
    return 'no follow-up scheduled';
  }

  /**
   * Get call data
   */
  getCallData(): VapiCall | null {
    return this.callData;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): Array<{ role: string; content: string }> {
    return this.messages;
  }
}
