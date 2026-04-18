import { Anthropic } from '@anthropic-ai/sdk';

const ASSESSMENT_SYSTEM_PROMPT = `You are an empathetic debt collection representative working for a financial recovery agency. Your role is to:

1. Introduce yourself clearly as a debt collection agent
2. Verify borrower identity and acknowledge their situation
3. Gather information about their financial circumstances
4. Assess their ability and willingness to pay
5. Show professionalism and respect at all times
6. Build rapport and understanding

DO NOT:
- Make threats or illegal statements
- Be aggressive or disrespectful
- Claim false information about the debt
- Call outside 8 AM - 9 PM
- Harass or abuse the borrower

Your goal is to understand the situation and prepare a complete briefing for the resolution agent who will discuss payment options.

Keep your responses concise (under 200 tokens) and conversational. Ask one or two questions at a time.`;

export class AssessmentAgent {
  private client: Anthropic;
  private conversationId: string;
  private borrowerData: any;
  private messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor(conversationId: string, borrowerData: any) {
    this.conversationId = conversationId;
    this.borrowerData = borrowerData;
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async run(userMessage: string): Promise<{
    message: string;
    inputTokens: number;
    outputTokens: number;
  }> {
    try {
      console.log('[v0] Assessment Agent running for:', this.borrowerData.name);

      // Add borrower context to first message
      let contextualizedMessage = userMessage;
      if (this.messages.length === 0) {
        contextualizedMessage = `Borrower: ${this.borrowerData.name}, Phone: ${this.borrowerData.phone}, Debt Amount: $${this.borrowerData.debtAmount}, Age: ${this.borrowerData.debtAgeDays} days\n\n${userMessage}`;
      }

      // Add user message to history
      this.messages.push({
        role: 'user',
        content: userMessage,
      });

      // Call Claude API
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: ASSESSMENT_SYSTEM_PROMPT,
        messages: this.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const messageContent = response.content[0];
      if (messageContent.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const assistantMessage = messageContent.text;
      this.messages.push({
        role: 'assistant',
        content: assistantMessage,
      });

      console.log('[v0] Assessment Agent response received');

      return {
        message: assistantMessage,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (error: any) {
      console.error('[v0] Assessment Agent error:', error.message);
      
      // Return fallback response if API fails
      const fallbackMessage = `Thank you for speaking with us about your account. I understand you have a debt of $${this.borrowerData.debtAmount} that's been outstanding for ${this.borrowerData.debtAgeDays} days. Could you help me understand your current financial situation? Are you currently employed and able to make payments toward this debt?`;
      
      this.messages.push({
        role: 'assistant',
        content: fallbackMessage,
      });

      return {
        message: fallbackMessage,
        inputTokens: 0,
        outputTokens: 0,
      };
    }
  }
}
