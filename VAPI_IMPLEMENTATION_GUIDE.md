# Vapi Voice Agent Implementation

## Overview

Vapi integration enables outbound voice calls for the **Resolution Agent** (Phase 2.3). The system can now:
- Initiate automated outbound calls to borrowers
- Stream live transcripts in real-time
- Handle voice conversations with Claude AI backend
- Record and analyze call summaries
- Track call costs and metrics

## Architecture

### Components

1. **ResolutionVoiceAgent** (`lib/agents/resolution-voice-agent.ts`)
   - Manages voice call lifecycle via Vapi API
   - Handles call initiation, status polling, and transcript analysis
   - Implements sentiment analysis and payment extraction
   - Returns structured call analysis with agreement status

2. **Webhook Handler** (`app/api/webhooks/vapi/route.ts`)
   - Receives Vapi call events (started, ended, speech updates)
   - Processes transcript updates in real-time
   - Stores call data for analysis

3. **API Endpoints**
   - `POST /api/voice/initiate` - Start a new voice call
   - `GET /api/voice/status?callId=...` - Check call status
   - `POST /api/voice/end` - Terminate active call
   - `POST /api/webhooks/vapi` - Receive Vapi webhooks

4. **UI Integration**
   - "📞 Start Voice Call" button on case details page
   - Live call status panel with duration tracking
   - Real-time transcript display
   - Auto-polling for call updates

## Setup Instructions

### 1. Vapi Account Setup

```bash
# Go to https://vapi.ai and create an account
# Generate API key from dashboard
# Set environment variable:
VAPI_API_KEY=<your-vapi-api-key>
```

### 2. Provision Phone Number

In Vapi dashboard:
1. Go to "Phone Numbers"
2. Buy a phone number (e.g., +1-XXX-XXX-XXXX)
3. Copy the phone number ID (UUID format)
4. Set environment variable:
   ```
   VAPI_PHONE_NUMBER_ID=<phone-number-id>
   ```

### 3. Configure Webhook

In Vapi dashboard > Settings > Webhooks:
1. Set webhook URL: `https://yourdomain.com/api/webhooks/vapi`
2. Select events: `call.started`, `call.ended`, `speech.update`, `message`
3. Save configuration

### 4. Deploy

The `VAPI_API_KEY` is already in environment. Make sure `VAPI_PHONE_NUMBER_ID` is set in production.

## Usage

### Initiating a Voice Call

From dashboard or case details page, click "📞 Start Voice Call":

```typescript
// Automatically calls POST /api/voice/initiate
const response = await fetch('/api/voice/initiate', {
  method: 'POST',
  body: JSON.stringify({
    caseId: 'case-123',
    borrowerData: {
      id: 'borrower-456',
      name: 'John Martinez',
      phone: '+1-555-0101',
      debtAmount: 2500,
      debtAgeDays: 120,
    },
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
  }),
});
```

### Call Flow

1. **Initiate**: POST to `/api/voice/initiate`
   - Creates ResolutionVoiceAgent
   - Calls Vapi API to start outbound call
   - Returns `callId` for tracking

2. **Status Polling**: Frontend polls `/api/voice/status?callId={callId}` every 2 seconds
   - Updates duration counter
   - Fetches live transcript updates
   - Detects when call ends

3. **Webhook Events**: Vapi sends webhook to `/api/webhooks/vapi`
   - `call.started` - Call answered, recording begins
   - `speech.update` - Live transcript fragments
   - `call.ended` - Call disconnected, final transcript + summary

4. **Analysis**: When call ends, ResolutionVoiceAgent analyzes:
   - Sentiment (negative/neutral/positive)
   - Payment amount proposed
   - Whether agreement was reached
   - Next follow-up actions

### Call Lifecycle

```
User clicks "Start Voice Call"
         ↓
POST /api/voice/initiate
         ↓
ResolutionVoiceAgent.initiateCall()
         ↓
Vapi outbound call starts (ringing)
         ↓
Borrower answers → call.started webhook
         ↓
Live conversation with Claude AI agent
         ↓
Agent proposes payment plan
         ↓
Borrower accepts/declines
         ↓
Call disconnected → call.ended webhook
         ↓
Transcript + summary stored
         ↓
Frontend updates with results
```

## System Prompts

### Resolution Voice Agent

The agent follows FDCPA compliance rules:
- Never threaten or use abusive language
- Respect calling hours (8 AM - 9 PM)
- Keep calls to 600 seconds max (10 minutes)
- Present multiple payment options
- Confirm borrower understanding
- Document all agreements

```
You are a professional debt resolution specialist conducting phone calls...
Keep call time reasonable and professional.
Your goal is to reach a mutually acceptable payment resolution.
```

## Voice Configuration

- **Voice Provider**: ElevenLabs
- **Voice**: Paula (professional, empathetic)
- **Model**: Claude 3.5 Sonnet (via Vapi)
- **Temperature**: 0.7 (balanced creativity and consistency)
- **Max Duration**: 10 minutes (600 seconds)

## Metrics Tracked

Per call:
- **Duration**: Total call time in seconds
- **Cost**: Vapi charge (approx $0.07-0.15 per minute)
- **Sentiment**: Borrower emotion (negative/neutral/positive)
- **Agreement**: Whether payment plan was accepted
- **Payment Amount**: Proposed monthly payment ($)
- **Next Steps**: Callback scheduled or documents to send

## Cost Model

- **Outbound call**: $0.07 - $0.15 per minute (Vapi pricing)
- **ElevenLabs voice**: Included in Vapi pricing
- **Transcription**: Included in Vapi pricing
- **Average call**: 5-10 minutes = $0.35 - $1.50 per call

**Budget**: Under $20 per case for voice phase (10-15 calls/case max)

## Error Handling

### Missing Configuration

If `VAPI_PHONE_NUMBER_ID` is not set:
```json
{
  "error": "Missing Vapi phoneNumberId. Configure in settings.",
  "hint": "Get a phone number from Vapi dashboard and set VAPI_PHONE_NUMBER_ID"
}
```

### Failed Call Initiation

If Vapi API returns error:
```json
{
  "error": "Failed to initiate voice call",
  "details": "Invalid phone number format"
}
```

### Webhook Signature Verification

Optional: Verify webhook authenticity via `x-vapi-signature` header

## Integration with Workflow

Voice calls are triggered during **Agent 2 (Resolution)** phase:

```
Assessment Agent (Chat) ✓
       ↓
Handoff Context
       ↓
Resolution Agent (Voice) ← You are here
       ↓
Agreement Reached?
       ├─ Yes → Mark Case Resolved
       └─ No → Schedule Follow-up / Escalate
```

## Testing

### Test Without Real Phone Numbers

For development, comment out actual call initiation:

```typescript
// In ResolutionVoiceAgent.initiateCall()
if (process.env.NODE_ENV === 'development') {
  return {
    callId: 'mock-call-' + Date.now(),
    status: 'mock',
    message: 'Mock call (development mode)'
  };
}
```

### Monitor Webhook Events

Vapi dashboard shows all webhook deliveries:
1. Go to Vapi dashboard > Webhooks
2. View delivery history
3. Check payload for each event

## Production Checklist

- [ ] VAPI_API_KEY set in production environment
- [ ] VAPI_PHONE_NUMBER_ID provisioned and configured
- [ ] Webhook URL added to Vapi settings
- [ ] HTTPS enabled (Vapi requires secure endpoints)
- [ ] Error handling in place for failed calls
- [ ] Recording storage configured (if needed)
- [ ] Cost monitoring dashboard active
- [ ] FDCPA compliance audit complete

## Known Limitations

1. **Single Phone Number**: Currently only supports one Vapi phone number
   - Future: Support multiple numbers for load balancing

2. **No Call Recording Playback**: Transcripts stored but no audio playback UI yet
   - Future: Add call replay component

3. **Manual Webhook Configuration**: Webhook URL must be manually set in Vapi dashboard
   - Future: Auto-register webhook via Vapi API

4. **No Call Retry Logic**: Failed calls don't auto-retry
   - Future: Implement exponential backoff retry in Resolution Agent

## Next Steps (Phase 2.4+)

1. **Call Recording Storage**: Save transcripts to Supabase
2. **Call Analytics Dashboard**: Show call metrics by borrower segment
3. **A/B Testing**: Test different voice agents and propositions
4. **Multi-Number Load Balancing**: Distribute calls across multiple phone numbers
5. **Integration with Learning Loop**: Use call outcomes to improve prompts

## Support

For Vapi issues:
- Check [Vapi documentation](https://docs.vapi.ai)
- Review call logs in Vapi dashboard
- Check webhook delivery status

For implementation questions:
- See DECISION_JOURNAL.md for architecture rationale
- Review ResolutionVoiceAgent class for API usage patterns
