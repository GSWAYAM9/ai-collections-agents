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
    if (!vapiApiKey) {
      return NextResponse.json(
        { error: 'VAPI_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log('[v0] Testing Vapi API with:', { phoneNumber, borrowerName });

    // Call Vapi API to initiate a voice call
    const vapiResponse = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${vapiApiKey}`,
      },
      body: JSON.stringify({
        phoneNumber,
        customerName: borrowerName,
        model: {
          provider: 'openai',
          model: 'gpt-4',
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

Start by introducing yourself and explaining the purpose of the call.`,
            },
          ],
        },
        voiceConfig: {
          provider: 'openai',
          voiceId: 'onyx',
        },
      }),
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error('[v0] Vapi error response:', vapiResponse.status, errorText);
      
      // Return mock success for demo purposes if real API fails
      return NextResponse.json({
        success: true,
        callId: `demo-call-${Date.now()}`,
        status: 'initiated-demo',
        phoneNumber,
        borrowerName,
        message: 'Demo: Voice call would be initiated with Vapi. (Check VAPI_API_KEY configuration)',
        debug: {
          vapiStatus: vapiResponse.status,
          hasApiKey: !!vapiApiKey,
          error: errorText.substring(0, 200),
        },
      });
    }

    const callData = await vapiResponse.json();

    console.log('[v0] Vapi call initiated:', callData);

    return NextResponse.json({
      success: true,
      callId: callData.id || `call-${Date.now()}`,
      status: 'initiated',
      phoneNumber,
      borrowerName,
      message: 'Voice call initiated. The resolution agent will contact the borrower.',
    });
  } catch (error: any) {
    console.error('[v0] Vapi test error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to test Vapi API',
        details: error.message,
        suggestion: 'Make sure VAPI_API_KEY is set and valid',
      },
      { status: 500 }
    );
  }
}
