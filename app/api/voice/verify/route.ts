import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/voice/verify
 * Verify that Vapi is properly configured
 */
export async function GET(req: NextRequest) {
  const hasVapiKey = !!process.env.VAPI_API_KEY;
  const hasPhoneNumber = !!process.env.VAPI_PHONE_NUMBER_ID;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  const vercelUrl = process.env.VERCEL_URL;

  if (!hasVapiKey || !hasPhoneNumber) {
    return NextResponse.json(
      {
        status: 'NOT_CONFIGURED',
        configured: false,
        hasApiKey: hasVapiKey,
        hasPhoneNumberId: hasPhoneNumber,
        message: 'Vapi is not fully configured',
        missingConfig: {
          apiKey: !hasVapiKey ? 'VAPI_API_KEY not set' : null,
          phoneNumberId: !hasPhoneNumber ? 'VAPI_PHONE_NUMBER_ID not set' : null,
        },
      },
      { status: 400 }
    );
  }

  // Verify API key works by making a test call to Vapi
  try {
    const response = await fetch('https://api.vapi.ai/account', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'API_ERROR',
          configured: false,
          error: 'Invalid Vapi API key',
          details: `Vapi API responded with status ${response.status}`,
          webhookUrl: `${vercelUrl || 'http://localhost:3000'}/api/webhooks/vapi`,
        },
        { status: 400 }
      );
    }

    const accountData = await response.json();

    return NextResponse.json({
      status: 'CONFIGURED',
      configured: true,
      hasApiKey: true,
      hasPhoneNumberId: true,
      phoneNumberId: phoneNumberId?.substring(0, 8) + '***',
      accountId: accountData.id?.substring(0, 8) + '***' || 'unknown',
      message: 'Vapi is properly configured and ready for voice calls',
      webhookUrl: `${vercelUrl || 'http://localhost:3000'}/api/webhooks/vapi`,
      nextSteps: [
        'Go to /dashboard Cases tab',
        'Click on a case card',
        'Click "📞 Start Voice Call" button',
        'Monitor the call status in real-time',
      ],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'VERIFICATION_ERROR',
        configured: false,
        error: 'Failed to verify Vapi configuration',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
