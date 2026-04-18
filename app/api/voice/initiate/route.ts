import { NextRequest, NextResponse } from 'next/server';
import { ResolutionVoiceAgent } from '@/lib/agents/resolution-voice-agent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { caseId, borrowerData, phoneNumberId } = body;

    if (!caseId || !borrowerData || !borrowerData.phone) {
      return NextResponse.json(
        { error: 'Missing required fields: caseId, borrowerData with phone' },
        { status: 400 }
      );
    }

    if (!phoneNumberId) {
      return NextResponse.json(
        {
          error: 'Missing Vapi phoneNumberId. Configure in settings.',
          hint: 'Get a phone number from Vapi dashboard and set VAPI_PHONE_NUMBER_ID',
        },
        { status: 400 }
      );
    }

    console.log('[v0] Initiating voice call to:', borrowerData.phone);

    // Create resolution voice agent
    const agent = new ResolutionVoiceAgent(caseId, borrowerData, phoneNumberId);

    // Initiate the call
    const callResult = await agent.initiateCall();

    console.log('[v0] Voice call initiated:', callResult.callId);

    return NextResponse.json({
      success: true,
      callId: callResult.callId,
      status: callResult.status,
      message: callResult.message,
      borrower: {
        name: borrowerData.name,
        phone: borrowerData.phone,
      },
      webhookUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/webhooks/vapi`,
    });
  } catch (error: any) {
    console.error('[v0] Voice call error:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to initiate voice call',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Check if Vapi is configured
 */
export async function GET(req: NextRequest) {
  const hasVapiKey = !!process.env.VAPI_API_KEY;
  const hasPhoneNumber = !!process.env.VAPI_PHONE_NUMBER_ID;

  return NextResponse.json({
    vapiConfigured: hasVapiKey && hasPhoneNumber,
    hasApiKey: hasVapiKey,
    hasPhoneNumberId: hasPhoneNumber,
    webhookUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/webhooks/vapi`,
  });
}
