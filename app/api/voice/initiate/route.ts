import { NextRequest, NextResponse } from 'next/server';
import { ResolutionVoiceAgent } from '@/lib/agents/resolution-voice-agent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { caseId, borrowerData } = body;

    console.log('[v0] Voice initiate endpoint called with:', { caseId, phone: borrowerData?.phone });

    if (!caseId || !borrowerData || !borrowerData.phone) {
      return NextResponse.json(
        { error: 'Missing required fields: caseId, borrowerData with phone' },
        { status: 400 }
      );
    }

    const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
    const apiKey = process.env.VAPI_API_KEY;
    
    console.log('[v0] Environment check:', {
      hasPhoneNumberId: !!phoneNumberId,
      hasApiKey: !!apiKey,
      phoneNumberIdValue: phoneNumberId ? phoneNumberId.slice(0, 8) + '...' : 'NOT SET',
    });

    if (!phoneNumberId) {
      return NextResponse.json(
        {
          error: 'Vapi phoneNumberId not configured',
          hint: 'Set VAPI_PHONE_NUMBER_ID environment variable',
        },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Vapi API key not configured',
          hint: 'Set VAPI_API_KEY environment variable',
        },
        { status: 400 }
      );
    }

    console.log('[v0] Creating ResolutionVoiceAgent instance...');

    // Create resolution voice agent
    const agent = new ResolutionVoiceAgent(caseId, borrowerData, phoneNumberId);

    console.log('[v0] Calling agent.initiateCall()...');

    // Initiate the call
    const callResult = await agent.initiateCall();

    console.log('[v0] Voice call initiated successfully:', callResult.callId);

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
    console.error('[v0] Voice call error:', {
      message: error.message,
      stack: error.stack,
    });
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
