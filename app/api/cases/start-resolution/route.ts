import { NextRequest, NextResponse } from 'next/server';

/**
 * Trigger Resolution Agent (Vapi Voice Call)
 * POST /api/cases/start-resolution
 */
export async function POST(req: NextRequest) {
  try {
    const { caseId, borrowerPhone, borrowerName } = await req.json();

    if (!caseId || !borrowerPhone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const vapiApiKey = process.env.VAPI_API_KEY;
    const vapiPhoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
    
    if (!vapiApiKey) {
      console.warn('[v0] VAPI_API_KEY not configured');
      return NextResponse.json(
        { error: 'VAPI_API_KEY environment variable not set' },
        { status: 500 }
      );
    }

    if (!vapiPhoneNumberId) {
      console.warn('[v0] VAPI_PHONE_NUMBER_ID not configured');
      return NextResponse.json(
        { error: 'VAPI_PHONE_NUMBER_ID environment variable not set' },
        { status: 500 }
      );
    }

    // Ensure phone number has + prefix
    const formattedPhone = borrowerPhone.startsWith('+') ? borrowerPhone : `+1${borrowerPhone}`;

    const vapiPayload = {
      assistantId: process.env.VAPI_ASSISTANT_ID || '550e8400-e29b-41d4-a716-446655440000', // Default UUID if not set
      phoneNumberId: vapiPhoneNumberId,
      customer: {
        number: formattedPhone,
      },
      assistantOverrides: {
        model: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content: `You are the Resolution Agent for a debt collections company. Your goal is to negotiate payment terms with the borrower.
              
Key objectives:
1. Confirm the debt amount and borrower identity
2. Understand their financial situation
3. Negotiate flexible payment terms they can afford
4. Document the agreement
5. Schedule next payment

Important compliance rules:
- Be respectful and professional
- No threats or abusive language
- Respect all stated preferences
- Provide accurate debt information
- Document everything

Borrower Name: ${borrowerName}
Debt Case ID: ${caseId}`,
            },
          ],
        },
        voice: {
          provider: '11labs',
          voiceId: 'paula',
        },
        firstMessage: `Hi ${borrowerName}, this is a follow-up regarding your debt account. Do you have a few minutes to discuss a payment arrangement that works for your situation?`,
      },
    };

    console.log('[v0] Calling Vapi API...');
    console.log('[v0] Phone:', formattedPhone);
    console.log('[v0] Phone Number ID:', vapiPhoneNumberId.slice(0, 8) + '...');

    const vapiResponse = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vapiPayload),
    });

    const responseData = await vapiResponse.json();

    if (!vapiResponse.ok) {
      console.error('[v0] Vapi API error:', {
        status: vapiResponse.status,
        error: responseData,
      });
      
      return NextResponse.json(
        {
          error: 'Vapi API call failed',
          details: responseData.message || responseData.error || 'Unknown error',
          vapiStatus: vapiResponse.status,
        },
        { status: vapiResponse.status || 500 }
      );
    }

    console.log('[v0] Vapi call initiated successfully:', responseData.id);

    return NextResponse.json({
      success: true,
      callId: responseData.id,
      status: 'initiated',
      caseId,
      borrowerPhone: formattedPhone,
      borrowerName,
      agent: 'resolution',
      message: 'Voice call initiated with Vapi Resolution Agent',
      mode: 'production',
    });
  } catch (error: any) {
    console.error('[v0] Resolution trigger error:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        error: 'Failed to start resolution call',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
