import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AssessmentAgent } from '@/lib/agents/assessment-agent';

// In-memory mock database for development
const mockDb = {
  borrowers: [] as any[],
  cases: [] as any[],
  conversations: [] as any[],
  messages: [] as any[],
};

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

    console.log('[v0] Creating case for:', borrowerName);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let borrower: any = null;
    let caseData: any = null;
    let useMock = false;

    // Try real Supabase first
    if (supabaseUrl && serviceRoleKey) {
      try {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: borrowerData, error: borrowerError } = await supabase
          .from('borrowers')
          .insert({
            name: borrowerName,
            phone_number: phoneNumber,
            debt_amount_cents: Math.round(debtAmount * 100),
            debt_age_days: debtAgeDays || 90,
          })
          .select()
          .single();

        if (borrowerError) throw borrowerError;
        borrower = borrowerData;

        const { data: caseDataResult, error: caseError } = await supabase
          .from('cases')
          .insert({
            borrower_id: borrower.id,
            status: 'initial_contact',
          })
          .select()
          .single();

        if (caseError) throw caseError;
        caseData = caseDataResult;

        console.log('[v0] Using real Supabase database');
      } catch (error: any) {
        console.log('[v0] Supabase failed, using mock database:', error.message);
        useMock = true;
      }
    } else {
      useMock = true;
    }

    // Fall back to mock database
    if (useMock) {
      borrower = {
        id: 'mock-' + Math.random().toString(36).substr(2, 9),
        name: borrowerName,
        phone_number: phoneNumber,
        debt_amount_cents: Math.round(debtAmount * 100),
        debt_age_days: debtAgeDays || 90,
        created_at: new Date().toISOString(),
      };
      mockDb.borrowers.push(borrower);

      caseData = {
        id: 'mock-case-' + Math.random().toString(36).substr(2, 9),
        borrower_id: borrower.id,
        status: 'initial_contact',
        retry_count: 0,
        max_retries: 3,
        created_at: new Date().toISOString(),
      };
      mockDb.cases.push(caseData);
      console.log('[v0] Using mock in-memory database');
    }

    // Run Assessment Agent
    const agent = new AssessmentAgent();
    const initialMessage = `Hello, I'm calling about a debt of $${debtAmount.toFixed(2)} that you may owe.`;

    if (stream) {
      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            const agentResponse = await agent.processMessage(initialMessage, {
              borrowerId: borrower.id,
              caseId: caseData.id,
            });

            // Stream response word by word
            const responseText = agentResponse.response;
            const words = responseText.split(' ');
            
            for (let i = 0; i < words.length; i++) {
              await new Promise(resolve => setTimeout(resolve, 50));
              const chunk = (i === 0 ? '' : ' ') + words[i];
              const data = JSON.stringify({ type: 'chunk', content: chunk });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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
              usingMockDb: useMock,
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

    // Non-streaming response
    const agentResponse = await agent.processMessage(initialMessage, {
      borrowerId: borrower.id,
      caseId: caseData.id,
    });

    return NextResponse.json({
      success: true,
      case: caseData,
      borrower: {
        id: borrower.id,
        name: borrower.name,
        phone: borrower.phone_number,
      },
      firstAgentResponse: agentResponse.response,
      message: `Case created successfully${useMock ? ' (using mock database - set up Supabase for persistence)' : ''}`,
      usingMockDb: useMock,
      metrics: {
        inputTokens: agentResponse.inputTokens || 0,
        outputTokens: agentResponse.outputTokens || 0,
        cost: agentResponse.cost || '0.00',
      },
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
