import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/vapi-status
 * Get Vapi configuration status for admin dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const hasVapiKey = !!process.env.VAPI_API_KEY;
    const hasPhoneNumber = !!process.env.VAPI_PHONE_NUMBER_ID;

    if (!hasVapiKey || !hasPhoneNumber) {
      return NextResponse.json({
        ready: false,
        status: 'INCOMPLETE',
        message: 'Vapi configuration incomplete',
        checks: {
          apiKey: hasVapiKey ? '✓' : '✗',
          phoneNumberId: hasPhoneNumber ? '✓' : '✗',
        },
        missingItems: [
          !hasVapiKey && 'VAPI_API_KEY',
          !hasPhoneNumber && 'VAPI_PHONE_NUMBER_ID',
        ].filter(Boolean),
      });
    }

    // Test API key
    const response = await fetch('https://api.vapi.ai/account', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const ready = response.ok;

    return NextResponse.json({
      ready,
      status: ready ? 'READY' : 'ERROR',
      message: ready ? 'Vapi is configured and ready for voice calls' : 'Vapi API key is invalid',
      checks: {
        apiKey: '✓',
        phoneNumberId: '✓',
        apiConnection: ready ? '✓' : '✗',
      },
      webhookUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/webhooks/vapi`,
    });
  } catch (error: any) {
    return NextResponse.json({
      ready: false,
      status: 'ERROR',
      message: 'Failed to check Vapi status',
      error: error.message,
    });
  }
}
