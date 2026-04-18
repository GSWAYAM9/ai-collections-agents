import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const { borrowerMessage } = await req.json();

    if (!borrowerMessage) {
      return NextResponse.json(
        { error: 'Missing borrowerMessage' },
        { status: 400 }
      );
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey: anthropicApiKey });

    // Assessment Agent system prompt
    const systemPrompt = `You are an Assessment Agent for a debt collections company. Your role is to:
1. Build rapport with the borrower
2. Gather financial information to understand their situation
3. Assess their ability and willingness to pay
4. Determine next steps for resolution

Important FDCPA Compliance Requirements:
- Identify yourself as a debt collector
- Be respectful and empathetic
- Never make threats or use abusive language
- Only contact between 8 AM and 9 PM
- Respect all communication preferences
- Provide accurate debt information
- Do not misrepresent consequences

Generate a helpful, empathetic response that moves the conversation forward while maintaining compliance.`;

    let response;
    const modelsToTry = [
      'claude-opus-4-1-20250805',
      'claude-3-5-sonnet-20241022',
      'claude-3-sonnet-20240229',
      'claude-opus-4-20250514',
    ];

    for (const model of modelsToTry) {
      try {
        console.log('[v0] Trying model:', model);
        response = await client.messages.create({
          model: model,
          max_tokens: 500,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: borrowerMessage,
            },
          ],
        });
        console.log('[v0] Success with model:', model);
        break;
      } catch (modelError: any) {
        console.log('[v0] Model failed:', model, modelError.status, modelError.error?.message);
        if (model === modelsToTry[modelsToTry.length - 1]) {
          throw modelError;
        }
      }
    }

    if (!response) {
      throw new Error('No Claude model available');
    }

    const messageContent = response.content[0];
    if (messageContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const agentResponse = messageContent.text;
    const { input_tokens, output_tokens } = response.usage;
    
    // Calculate cost (Claude 3.5 Sonnet pricing)
    const inputCost = (input_tokens * 3) / 1000000; // $3 per million input tokens
    const outputCost = (output_tokens * 15) / 1000000; // $15 per million output tokens
    const totalCost = inputCost + outputCost;

    console.log('[v0] Anthropic test response:', {
      inputTokens,
      outputTokens,
      cost: totalCost.toFixed(6),
    });

    return NextResponse.json({
      response: agentResponse,
      inputTokens,
      outputTokens,
      cost: totalCost.toFixed(6),
      model: response.model,
    });
  } catch (error: any) {
    console.error('[v0] Anthropic test error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to test Anthropic API',
        details: error.error?.message || '',
      },
      { status: 500 }
    );
  }
}
