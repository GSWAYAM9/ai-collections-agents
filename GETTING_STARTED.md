# Getting Started Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Set Environment Variables

Add to Vercel project settings (or `.env.local` for local dev):

```env
ANTHROPIC_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
VAPI_API_KEY=your_key_here  # Optional
```

### Step 2: Install & Build

```bash
pnpm install
pnpm build
```

### Step 3: Start Server

```bash
pnpm dev
```

Open http://localhost:3000 (will show 404 - that's normal, we use API endpoints)

### Step 4: Try the API

**Run a basic evaluation:**
```bash
curl "http://localhost:3000/api/evaluation/run?batchSize=5&seed=42"
```

**Check the output:**
```json
{
  "success": true,
  "evaluation": {
    "run_id": "uuid...",
    "batch_size": 5,
    "avg_resolution_rate": 0.45,
    "avg_compliance_score": 94.2,
    "total_cost": 0.023
  }
}
```

## 📊 Understanding the Results

- **Resolution Rate** (0-1): % of conversations reaching agreement or legal escalation
- **Compliance Score** (0-100): How well the agent followed FDCPA rules
- **Context Efficiency** (0-1): Quality of output relative to tokens used
- **Total Cost**: API spending for this evaluation

## 🔄 Running Full Learning Loop

The system can automatically generate and test new prompts:

```bash
# 1. Generate a new prompt variant (improves resolution)
curl -X POST http://localhost:3000/api/prompts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "assessment",
    "version": 1,
    "improvementArea": "increase_resolution_rate"
  }'

# 2. Run evaluation on new variant
# (this happens automatically - check database for results)

# 3. If improvement is significant, it's adopted
# (check prompt_variants table for adopted_at timestamp)
```

## 📚 Project Structure

**Key folders:**
- `lib/agents/` - The 3 specialized agents
- `lib/evaluation/` - Test harness and metrics
- `lib/learning/` - Self-improving loop
- `lib/workflow/` - Temporal workflow setup
- `app/api/` - REST endpoints
- `scripts/` - Database schema and setup

**Key files:**
- `DECISION_JOURNAL.md` - Architecture decisions
- `README.md` - Full documentation
- `EVOLUTION_REPORT_TEMPLATE.md` - Report template

## 🗄️ Database

Tables to check:
- `conversation_scores` - Individual conversation metrics
- `prompt_variants` - Generated prompt versions
- `evaluation_runs` - Evaluation run summaries
- `cost_log` - API spending
- `evaluation_disagreements` - Meta-evaluation findings

View in Supabase dashboard or query via API.

## 🐳 Docker Deployment

Local Docker setup (includes PostgreSQL):
```bash
docker-compose up --build
```

Then http://localhost:3000

## 🧪 Testing

Run quick evaluation:
```bash
pnpm tsx scripts/run-evaluation.ts
```

## 💡 Common Tasks

### Check Budget Usage
```bash
curl "http://localhost:3000/api/cost/summary"
```

### View Compliance Issues
```bash
# Check evaluation_disagreements table for issues
select * from evaluation_disagreements 
where is_correction_adopted = false
order by disagreement_magnitude desc;
```

### Run Specific Test Scenario
```bash
curl "http://localhost:3000/api/evaluation/run?batchSize=1&seed=99&scenario=angry_debtor"
```

### Generate Evolution Report
```bash
pnpm tsx scripts/generate-report.ts
```

## 🚨 Troubleshooting

**"Token budget exceeded"**
- Agents are using too many tokens
- Check system prompt length
- Look at conversation history in database

**"Compliance score below 98%"**
- Prompt violates FDCPA rules
- Check DECISION_JOURNAL.md for rule definitions
- Meta-evaluator may have found issues

**"API keys not set"**
- Verify all env vars are in Vercel settings
- Or create `.env.local` for local development
- Run: `echo $ANTHROPIC_API_KEY` to verify

**"Database connection failed"**
- For Supabase: double-check URL/keys
- For Docker: run `docker-compose ps` to check status
- Ensure SUPABASE_SERVICE_ROLE_KEY is set (admin operations)

## 📈 Next Steps

1. **Understand the agents**: Read `lib/agents/assessment-agent.ts`
2. **Run evaluations**: Try different batch sizes and seeds
3. **Generate variants**: Use prompt generation API
4. **Check meta-evaluation**: Look for systematic issues
5. **Scale it**: Deploy to Vercel or Docker for production

## 🎓 Learning Resources

- Challenge specification: See `/user_read_only_context/text_attachments/challenge-*.md`
- API SDK docs: https://sdk.vercel.ai (for AI SDK patterns)
- Anthropic docs: https://anthropic.com/docs
- FDCPA rules: Compliance checkers based on 8 rules

## 📞 Support

- Check `DECISION_JOURNAL.md` for architectural decisions
- Review `README.md` for full documentation
- API responses include detailed error messages
- Check console logs for debugging info

---

**You're ready to go! Start with:**
```bash
curl "http://localhost:3000/api/evaluation/run?batchSize=5"
```

Good luck! 🎉
