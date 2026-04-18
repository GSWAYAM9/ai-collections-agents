import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AssessmentAgent } from '@/lib/agents/assessment-agent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { borrowerName, phoneNumber, debtAmount, debtAgeDays, stream } = body;

    if (!borrowerName || !phoneNumber || !debtAmount) {
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

    console.log('[v0] Creating new case for:', borrowerName);

    // Create borrower
    const { data: borrower, error: borrowerError } = await supabase
      .from('borrowers')
      .insert({
        name: borrowerName,
        phone_number: phoneNumber,
        debt_amount_cents: Math.round(debtAmount * 100),
        debt_age_days: debtAgeDays || 90,
      })
      .select()
      .single();

    if (borrowerError) {
      console.error('[v0] Borrower creation error:', borrowerError);
      return NextResponse.json(
        { error: 'Failed to create borrower', details: borrowerError.message },
        { status: 500 }
      );
    }

    // Create case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .insert({
        borrower_id: borrower.id,
        status: 'initial_contact',
      })
      .select()
      .single();

    if (caseError) {
      console.error('[v0] Case creation error:', caseError);
      return NextResponse.json(
        { error: 'Failed to create case', details: caseError.message },
        { status: 500 }
      );
    }

    console.log('[v0] Case created:', caseData.id);

    // If streaming requested, return SSE stream
    if (stream) {
      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            // Run Assessment Agent with streaming
            const agent = new AssessmentAgent();
            const initialMessage = `Hello, I'm calling about a debt of $${debtAmount.toFixed(2)} that you may owe.`;
            
            const agentResponse = await agent.processMessage(initialMessage, {
              borrowerId: borrower.id,
              caseId: caseData.id,
            });

            // Stream the response in chunks
            const responseText = agentResponse.response;
            const words = responseText.split(' ');
            
            for (let i = 0; i < words.length; i++) {
              await new Promise(resolve => setTimeout(resolve, 50)); // Slight delay for visual effect
              const chunk = (i === 0 ? '' : ' ') + words[i];
              const data = JSON.stringify({ type: 'chunk', content: chunk });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            // Create conversation record
            const { data: conversation } = await supabase
              .from('conversations')
              .insert({
                case_id: caseData.id,
                agent_name: 'assessment',
                medium: 'chat',
                status: 'in_progress',
              })
              .select()
              .single();

            // Store messages
            if (conversation) {
              await supabase.from('messages').insert([
                {
                  conversation_id: conversation.id,
                  role: 'user',
                  content: initialMessage,
                },
                {
                  conversation_id: conversation.id,
                  role: 'assistant',
                  content: responseText,
                },
              ]);
            }

            // Send complete event
            const completeData = JSON.stringify({
              type: 'complete',
              case: caseData,
              borrower: {
                id: borrower.id,
                name: borrower.name,
                phone: borrower.phone_number,
              },
              firstAgentResponse: responseText,
              metrics: {
                inputTokens: agentResponse.inputTokens || 0,
                outputTokens: agentResponse.outputTokens || 0,
                cost: agentResponse.cost || '0.00',
              },
            });
            controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
            controller.close();
          } catch (error: any) {
            console.error('[v0] Streaming error:', error);
            const errorData = JSON.stringify({ type: 'error', error: error.message });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(customReadable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming response (original behavior)
    const agent = new AssessmentAgent();
    const initialMessage = `Hello, I'm calling about a debt of $${debtAmount.toFixed(2)} that you may owe.`;
    
    const agentResponse = await agent.processMessage(initialMessage, {
      borrowerId: borrower.id,
      caseId: caseData.id,
    });

    // Create conversation record
    const { data: conversation } = await supabase
      .from('conversations')
      .insert({
        case_id: caseData.id,
        agent_name: 'assessment',
        medium: 'chat',
        status: 'in_progress',
      })
      .select()
      .single();

    // Store messages
    if (conversation) {
      await supabase.from('messages').insert([
        {
          conversation_id: conversation.id,
          role: 'user',
          content: initialMessage,
        },
        {
          conversation_id: conversation.id,
          role: 'assistant',
          content: agentResponse.response,
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      case: caseData,
      borrower: {
        id: borrower.id,
        name: borrower.name,
        phone: borrower.phone_number,
      },
      firstAgentResponse: agentResponse.response,
      message: 'Case created and Assessment Agent initiated',
    });
  } catch (error: any) {
    console.error('[v0] Case creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create case',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
