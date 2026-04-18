# Vapi International Calls - Limitation & Solutions

## Issue: Free Vapi Numbers Don't Support International Calls

**Error Message:**
```
Free Vapi numbers do not support international calls.
```

**What This Means:**
- The phone number you have from Vapi (`VAPI_PHONE_NUMBER_ID`) is a **free tier number**
- Free tier numbers can ONLY make calls within the same country
- To call India (+91), you need a premium Vapi number or your own verified phone number

---

## Current Status

✓ **Working:** US domestic calls (+1 format)  
✗ **Not Working:** International calls (+91 India format)

The system is currently configured to use US phone numbers for testing with your free Vapi tier.

---

## Solutions to Enable International Calls

### Solution 1: Add Your Own Phone Number (Recommended for Production)

1. Go to [Vapi Dashboard](https://dashboard.vapi.ai)
2. Navigate to **Phone Numbers**
3. Click **"Add Phone Number"**
4. Enter your business phone number (must be verified and active)
5. Follow Vapi's verification process
6. Get the new `phoneNumberId` 
7. Replace `VAPI_PHONE_NUMBER_ID` environment variable

**Advantages:**
- Full international calling support
- Your brand number on caller ID
- Professional appearance for borrowers
- Pay-as-you-go pricing

**Cost:** ~$0.07-0.15 per minute + your phone number provider costs

---

### Solution 2: Upgrade Vapi Account to Premium

1. Log into [Vapi Dashboard](https://dashboard.vapi.ai)
2. Go to **Billing** or **Account Settings**
3. Upgrade to premium tier
4. Premium numbers support international calls
5. Request a new international-capable phone number

**Advantages:**
- Simpler setup (no number verification needed)
- Automatic international support
- Better reliability and support

**Cost:** Check [Vapi Pricing](https://vapi.ai/pricing)

---

### Solution 3: Test with US Numbers (Current Setup)

For MVP/testing purposes, use US phone numbers:
- Format: `+1-555-XXXX` or `+15550000`
- Create test cases with US numbers
- Phone numbers are automatically cleaned and formatted by the system
- Once you have a real international number, just change the environment variable

**Advantages:**
- No setup required
- Free tier working immediately
- Can test the full workflow

**How to Test:**
1. Create a case at `/cases/start`
2. Use phone number like `+1-555-0123`
3. Click "Start Voice Call"
4. Vapi will initiate the call

---

## For Indian Customers & Numbers

If you need to make calls to India (+91 numbers):

### Option A: International Capable Number
- Requires premium Vapi account or your own verified number
- Estimated cost: $0.15-0.30 per minute for India calls
- Recommended for production deployments

### Option B: Local Alternative
- Use a local Indian number provider that integrates with Vapi
- Check Vapi documentation for partner providers
- May have better local calling rates

### Option C: Gradual Rollout
- Start testing with US/UK numbers (free tier)
- Upgrade when ready for production
- Deploy to India market with proper number setup

---

## How to Change Phone Numbers

When you get a new international-capable phone number:

1. Get the `phoneNumberId` from your Vapi dashboard
2. Update environment variable:
   ```
   VAPI_PHONE_NUMBER_ID=<new-id-here>
   ```
3. Redeploy the application
4. All new calls will use the new number

The codebase is designed to work with any Vapi `phoneNumberId` - no code changes needed!

---

## Current Configuration

**Current Setup:**
- Phone Number ID: `VAPI_PHONE_NUMBER_ID` (Free tier)
- Supported Calls: Domestic US only (+1)
- Status: ✓ Working for testing

**To Use International Numbers:**
1. Upgrade Vapi or add your own number
2. Get new `phoneNumberId`
3. Set environment variable
4. Done! No code changes needed

---

## Testing Recommendation

For now, the system is set up to:
- ✓ Accept any phone number format (+1, +91, etc.)
- ✓ Auto-format phone numbers correctly
- ✓ Make successful calls to US numbers
- ✗ Will reject international calls with "Free Vapi numbers don't support international calls"

**Suggested Testing Flow:**
1. Create test cases with US numbers (+1-555-XXXX)
2. Verify end-to-end call flow works
3. Test Assessment → Resolution → Final Notice agents
4. When ready for India: Upgrade Vapi or add verified number
5. Update environment variable and redeploy

---

## Questions?

- **Vapi Documentation:** https://docs.vapi.ai
- **Vapi Pricing:** https://vapi.ai/pricing
- **Support:** Check your Vapi account dashboard

The good news: Once you set up international numbers, the system will work perfectly for India and any country Vapi supports!
