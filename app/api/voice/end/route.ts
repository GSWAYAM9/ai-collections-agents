import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callId } = body;

    if (!callId) {
      return NextResponse.json(
        { error: 'Missing callId' },
        { status: 400 }
      );
    }

    const vapiKey = process.env.VAPI_API_KEY;
    if (!vapiKey) {
      return NextResponse.json(
        { error: 'Vapi API key not configured' },
        { status: 500 }
      );
    }

    console.log('[v0] Ending call:', callId);

    // End the call via Vapi
    await axios.delete(`https://api.vapi.ai/call/${callId}`, {
      headers: {
        Authorization: `Bearer ${vapiKey}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Call ended successfully',
      callId,
    });
  } catch (error: any) {
    console.error('[v0] Error ending call:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to end call',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
