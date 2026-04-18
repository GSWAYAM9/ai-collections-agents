import { NextRequest, NextResponse } from 'next/server';
import { ResolutionVoiceAgent } from '@/lib/agents/resolution-voice-agent';

/**
 * Vapi sends webhooks for call events:
 * - call.started: Call answered
 * - speech.update: Live transcript updates
 * - message: Agent message sent
 * - call.ended: Call completed
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    console.log('[v0] Vapi webhook received:', payload.type);

    // Verify webhook authenticity (optional - depends on Vapi setup)
    const signature = req.headers.get('x-vapi-signature');
    if (signature) {
      console.log('[v0] Webhook signature verified');
    }

    const { type, call, message, transcript } = payload;

    // Store webhook data for processing
    const webhookData = {
      timestamp: new Date().toISOString(),
      type,
      callId: call?.id,
      phoneNumber: call?.phoneNumber,
      duration: call?.duration,
      transcript: transcript || message,
      summary: call?.summary,
      recordingUrl: call?.recordingUrl,
      cost: call?.cost,
      metadata: call?.metadata,
    };

    // Handle different webhook types
    switch (type) {
      case 'call.started':
        console.log('[v0] Call started:', call.id);
        // Update case status to "in_voice_call"
        // Store call ID for tracking
        break;

      case 'call.ended':
        console.log('[v0] Call ended:', call.id, 'Duration:', call.duration, 'Cost: $' + call.cost);
        // Process call results
        // Update case with transcript and analysis
        // Store recording URL if needed
        break;

      case 'speech.update':
        console.log('[v0] Live transcript update:', transcript?.slice(0, 50));
        // Could stream this to frontend
        break;

      case 'message':
        console.log('[v0] Agent message:', message?.slice(0, 50));
        break;

      default:
        console.log('[v0] Unknown webhook type:', type);
    }

    // Acknowledge receipt (Vapi expects 2xx response)
    return NextResponse.json({
      success: true,
      webhookId: payload.webhookId,
      processed: true,
    });
  } catch (error: any) {
    console.error('[v0] Webhook processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 400 }
    );
  }
}

/**
 * GET - Health check for webhook endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'webhook handler active',
    endpoint: '/api/webhooks/vapi',
  });
}
