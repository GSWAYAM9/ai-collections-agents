# Vapi Setup Quick Start

## Prerequisites
- Vapi account created at https://vapi.ai
- VAPI_API_KEY environment variable already set ✓

## 3-Minute Setup

### Step 1: Get Phone Number ID

1. Log in to Vapi dashboard
2. Go to **Phone Numbers** section
3. Click **"Get a Phone Number"**
4. Choose country (US recommended for testing)
5. Purchase phone number
6. Copy the **Phone Number ID** (looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Step 2: Set Environment Variable

Add to your `.env.local` or production environment:

```bash
VAPI_PHONE_NUMBER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

If using Vercel:
1. Go to Project Settings → Environment Variables
2. Add key: `VAPI_PHONE_NUMBER_ID`
3. Paste the phone number ID
4. Deploy

### Step 3: Register Webhook

1. In Vapi dashboard, go to **Settings** → **Webhooks**
2. Click **"Add Webhook"**
3. Webhook URL: `https://yourdomain.com/api/webhooks/vapi`
   - For local testing: Use ngrok or similar (not required for MVP)
   - For production: Use your Vercel deployment URL
4. Select events:
   - ✓ `call.started`
   - ✓ `call.ended`
   - ✓ `speech.update`
   - ✓ `message`
5. Click **Save**

### Step 4: Test Voice Call

1. Go to dashboard → Cases tab
2. Open any case or create a new one
3. On case details page, click **"📞 Start Voice Call"**
4. System will:
   - Initiate outbound call to borrower phone number
   - Show live status panel with duration
   - Stream transcript in real-time
   - Detect when call ends
   - Display analysis (sentiment, payment, agreement)

## Troubleshooting

### "Missing Vapi phoneNumberId" Error
- **Fix**: Set `VAPI_PHONE_NUMBER_ID` environment variable
- **Verify**: Run `GET /api/voice/initiate` to check configuration

### Webhook Not Receiving Events
- **Check**: Verify webhook URL is HTTPS (Vapi requires secure endpoints)
- **Verify**: Go to Vapi dashboard → Webhooks → View delivery history
- **Test**: Manually trigger test webhook from Vapi dashboard

### Call Initiation Fails
- **Check**: Verify phone number has credits/is active in Vapi
- **Verify**: Borrower phone number is in E.164 format (+1-555-0101)
- **Logs**: Check server logs for Vapi API errors

### No Transcript Appearing
- **Check**: Call must be answered (in-progress status required)
- **Verify**: ElevenLabs voice provider is active in Vapi dashboard
- **Wait**: Transcription may lag 1-2 seconds behind live speech

## Monitoring

### Check Call Status

```bash
curl https://yourdomain.com/api/voice/status?callId=<call-id>
```

Response:
```json
{
  "status": "ended",
  "duration": 245,
  "transcript": "...",
  "cost": 0.42,
  "summary": "..."
}
```

### View Webhook Deliveries

In Vapi dashboard:
1. Settings → Webhooks
2. Click webhook URL
3. View "Delivery History"
4. Check payload and response for each event

## Cost Monitoring

Each voice call:
- **Vapi**: ~$0.07-0.15 per minute (~$0.42-0.75 for 5-min call)
- **ElevenLabs voice**: Included in Vapi pricing
- **Transcription**: Included in Vapi pricing

Monitor costs:
1. Vapi dashboard → **Usage** section
2. View monthly spend
3. Set spending limit if needed

## Next Steps

1. **Test with Borrowed Number**: Make a test call to yourself using Vapi phone number
2. **Train Borrower Prompts**: Adjust system prompt in ResolutionVoiceAgent for your use case
3. **Monitor Conversations**: Review transcripts and summaries for quality
4. **Collect Metrics**: Use call data to improve agent performance
5. **Scale Up**: Gradually increase to production borrower calls

## Support

- Vapi Docs: https://docs.vapi.ai
- API Reference: https://api.vapi.ai/docs
- Support: support@vapi.ai

For implementation questions, see `VAPI_IMPLEMENTATION_GUIDE.md`
