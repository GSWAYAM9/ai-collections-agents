import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json(
        { error: 'Missing callId parameter' },
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

    console.log('[v0] Checking call status:', callId);

    // Fetch call details from Vapi
    const response = await axios.get(`https://api.vapi.ai/call/${callId}`, {
      headers: {
        Authorization: `Bearer ${vapiKey}`,
      },
    });

    const callData = response.data;

    return NextResponse.json({
      success: true,
      callId: callData.id,
      status: callData.status,
      phoneNumber: callData.phoneNumber,
      duration: callData.duration || 0,
      transcript: callData.transcript || null,
      summary: callData.summary || null,
      recordingUrl: callData.recordingUrl || null,
      cost: callData.cost || 0,
      startedAt: callData.startedAt,
      endedAt: callData.endedAt,
    });
  } catch (error: any) {
    console.error('[v0] Error fetching call status:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to fetch call status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
