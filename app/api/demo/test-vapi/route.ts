import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, borrowerName } = await req.json();

    if (!phoneNumber || !borrowerName) {
      return NextResponse.json(
        { error: 'Missing phoneNumber or borrowerName' },
        { status: 400 }
      );
    }

    const vapiApiKey = process.env.VAPI_API_KEY;
    const vapiPhoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

    if (!vapiApiKey) {
      return NextResponse.json(
        { error: 'VAPI_API_KEY not configured' },
        { status: 500 }
      );
    }

    if (!vapiPhoneNumberId) {
      return NextResponse.json(
        { error: 'VAPI_PHONE_NUMBER_ID not configured' },
        { status: 500 }
      );
    }

    // Ensure phone number has + prefix and is in E.164 format (no dashes or spaces)
    let formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, ''); // Remove all spaces, dashes, parentheses
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+1${formattedPhone}`;
    }

    console.log('[v0] Testing Vapi API with:', { originalPhone: phoneNumber, formattedPhone, borrowerName });

    // Call Vapi API to initiate a voice call using correct endpoint and payload
    const callPayload: any = {
      phoneNumberId: vapiPhoneNumberId,
      customer: {
        number: formattedPhone,
      },
    };

    // Only add assistantId if explicitly configured
    if (process.env.VAPI_ASSISTANT_ID) {
      callPayload.assistantId = process.env.VAPI_ASSISTANT_ID;
    }

    // Add assistant overrides
    callPayload.assistantOverrides = {
      model: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are a professional debt resolution agent. Your goal is to reach a mutually beneficial payment arrangement with the borrower.
            
Key guidelines:
- Be professional and empathetic
- Explain available payment options clearly
- Listen to borrower constraints
- Work within their stated financial limitations
- Document all agreed terms
- Never threaten or misrepresent consequences
- Comply with all FDCPA regulations

Borrower: ${borrowerName}

Start by introducing yourself and explaining the purpose of the call.`,
          },
        ],
      },
      voice: {
        provider: '11labs',
        voiceId: 'paula',
      },
      firstMessage: `Hi ${borrowerName}, I'm calling to help you with a resolution on your account. Do you have a few minutes to talk?`,
    };

    const vapiResponse = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${vapiApiKey}`,
      },
      body: JSON.stringify(callPayload),
    });

    const callData = await vapiResponse.json();

    if (!vapiResponse.ok) {
      console.error('[v0] Vapi error response:', {
        status: vapiResponse.status,
        error: callData,
      });

      return NextResponse.json(
        {
          error: 'Vapi API call failed',
          details: callData.message || callData.error || 'Unknown error',
          vapiStatus: vapiResponse.status,
        },
        { status: vapiResponse.status || 500 }
      );
    }

    console.log('[v0] Vapi call initiated:', callData.id);

    return NextResponse.json({
      success: true,
      callId: callData.id,
      status: 'initiated',
      phoneNumber: formattedPhone,
      borrowerName,
      message: 'Voice call initiated. The resolution agent will contact the borrower.',
    });
  } catch (error: any) {
    console.error('[v0] Vapi test error:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        error: error.message || 'Failed to test Vapi API',
        details: error.message,
        suggestion: 'Make sure VAPI_API_KEY and VAPI_PHONE_NUMBER_ID are properly configured',
      },
      { status: 500 }
    );
  }
}
