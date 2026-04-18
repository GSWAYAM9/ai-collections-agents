import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Orchestrate Full 3-Agent Pipeline
 * POST /api/cases/orchestrate
 * 
 * Runs: Assessment -> Resolution -> Final Notice
 * Handles transitions between agents
 */
export async function POST(req: NextRequest) {
  try {
    const { caseId, action } = await req.json();

    if (!caseId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log('[v0] Orchestrating case:', caseId, 'action:', action);

    // Get case details
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*, borrowers(*)')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    let newStatus = caseData.status;
    let nextAction = null;

    // Handle state transitions
    switch (action) {
      case 'move-to-resolution':
        if (caseData.status === 'initial_contact' || caseData.status === 'assessment') {
          newStatus = 'in_resolution';
          nextAction = {
            agent: 'resolution',
            type: 'voice_call',
            target: caseData.borrowers.phone_number,
            caseId,
          };
        }
        break;

      case 'move-to-final-notice':
        if (caseData.status === 'in_resolution' || caseData.status === 'negotiation_failed') {
          newStatus = 'final_notice';
          nextAction = {
            agent: 'final_notice',
            type: 'chat',
            caseId,
          };
        }
        break;

      case 'resolve':
        newStatus = 'resolved';
        break;

      case 'escalate':
        newStatus = 'escalated';
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }

    // Update case status
    const { data: updatedCase, error: updateError } = await supabase
      .from('cases')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Execute next action if applicable
    let actionResult = null;

    if (nextAction?.type === 'voice_call') {
      // Trigger Vapi resolution call
      const vapiApiKey = process.env.VAPI_API_KEY;

      if (vapiApiKey) {
        const vapiPayload = {
          phoneNumber: nextAction.target,
          customerName: caseData.borrowers.name,
          systemPrompt: `You are the Resolution Agent for debt collections. Negotiate payment terms with ${caseData.borrowers.name}. Case: ${caseId}. Amount: $${(caseData.borrowers.debt_amount_cents / 100).toFixed(2)}`,
        };

        const vapiResponse = await fetch('https://api.vapi.ai/call', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vapiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(vapiPayload),
        });

        if (vapiResponse.ok) {
          const vapiData = await vapiResponse.json();
          actionResult = {
            type: 'vapi_call',
            callId: vapiData.id,
            status: 'initiated',
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      case: updatedCase,
      previousStatus: caseData.status,
      newStatus,
      nextAction: nextAction ? { ...nextAction, result: actionResult } : null,
      message: `Case moved to ${newStatus}`,
    });
  } catch (error: any) {
    console.error('[v0] Orchestration error:', error);
    return NextResponse.json(
      {
        error: 'Orchestration failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
