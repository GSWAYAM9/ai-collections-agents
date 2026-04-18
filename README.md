# Collections AI System - README

## Overview

This is a self-learning collections AI system that automates debt recovery through a multi-agent pipeline. The system features:

- **3-Agent Pipeline**: Assessment (chat) → Resolution (voice) → Final Notice (chat)
- **Self-Learning Loop**: Automatically generates and tests prompt variants
- **Compliance Preservation**: All 8 FDCPA rules enforced at every step
- **Meta-Evaluation**: Darwin-Godel system audits its own methodology
- **Cost Tracking**: Stays within $20 budget for learning loop
- **Reproducibility**: Deterministic evaluation with seeded borrower scenarios

## Architecture

```
Collections Pipeline
├── Phase 1: Assessment Agent (Chat)
│   └── Build rapport, gather info, assess ability to pay
├── Phase 2: Resolution Agent (Voice via Vapi)
│   └── Negotiate payment options, reach agreement
├── Phase 3: Final Notice Agent (Chat)
│   └── Issue formal notice or escalate to legal
└── Workflow: Temporal orchestration with retry logic
```

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm
- Anthropic API key
- Supabase account (or local PostgreSQL)
- Vapi account (optional, for voice agent)

### Setup

1. **Clone and install**:
```bash
git clone <repo>
cd collections-ai
pnpm install
```

2. **Configure environment**:
Create `.env.local`:
```env
ANTHROPIC_API_KEY=sk-...
VAPI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

3. **Setup database**:
```bash
# If using Supabase, run scripts/001_schema.sql in SQL editor
# If using local Docker:
docker-compose up -d
```

4. **Start development server**:
```bash
pnpm dev
```

5. **Run evaluation**:
```bash
curl http://localhost:3000/api/evaluation/run?batchSize=10&seed=42
```

## Project Structure

```
├── lib/
│   ├── types.ts                 # Core types
│   ├── config.ts                # Configuration
│   ├── token-manager.ts         # Context budget enforcement
│   ├── compliance-rules.ts      # 8 FDCPA rules
│   ├── supabase-client.ts       # Database client
│   ├── agents/                  # Agent implementations
│   │   ├── base-agent.ts
│   │   ├── assessment-agent.ts
│   │   ├── resolution-agent.ts
│   │   └── final-notice-agent.ts
│   ├── evaluation/              # Test harness & metrics
│   │   ├── simulated-borrower.ts
│   │   ├── metrics-calculator.ts
│   │   └── evaluation-harness.ts
│   ├── learning/                # Self-learning loop
│   │   ├── prompt-generator.ts
│   │   └── meta-evaluator.ts
│   └── workflow/                # Temporal workflow
│       ├── activities.ts
│       └── collections-workflow.ts
├── app/
│   └── api/                     # API endpoints
│       ├── cases/run
│       ├── evaluation/run
│       └── prompts/generate
├── scripts/
│   ├── 001_schema.sql           # Database schema
│   ├── setup.sh                 # Setup script
│   └── 002_seed-data.sql        # Test data (optional)
├── docker-compose.yml
├── Dockerfile
└── DECISION_JOURNAL.md
```

## Key Features

### 1. Context Budget Management
- Each agent gets 2000 tokens max per conversation
- Handoff summaries capped at 500 tokens
- Fail-fast: exceeding budget throws error

### 2. Compliance Enforcement
8 FDCPA rules automatically checked:
1. Identity disclosure
2. Professional tone
3. No false threats
4. Privacy protection
5. No harassment
6. Debt accuracy
7. Debt validity (statute of limitations)
8. TCPA compliance (call times/frequency)

### 3. Self-Learning Loop
```
Baseline → Evaluation → Metrics → Generation → Testing → Adoption
                              ↓
                      Meta-Evaluation
```

Process:
1. Run evaluation on current prompts (baseline)
2. Generate variants targeting weak areas
3. Test variants on same data
4. Compare statistical significance
5. Adopt if: resolution improves AND compliance ≥ 98%
6. Meta-evaluator audits methodology

### 4. Cost Management
Tracks costs for:
- Assessment agent ($0.0045/conv)
- Resolution agent ($0.006/conv)
- Final notice agent ($0.004/conv)
- Prompt generation (~$0.01/variant)
- Evaluation runs (~$0.05/batch)

Target: Stay under $20 for full learning cycle

## API Endpoints

### POST /api/cases/run
Start a collections workflow for a case.
```bash
curl -X POST http://localhost:3000/api/cases/run \
  -H "Content-Type: application/json" \
  -d '{"caseId": "case_123"}'
```

### GET /api/evaluation/run
Run evaluation harness.
```bash
curl "http://localhost:3000/api/evaluation/run?batchSize=10&seed=42"
```

### POST /api/prompts/generate
Generate new prompt variant.
```bash
curl -X POST http://localhost:3000/api/prompts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "assessment",
    "version": 1,
    "improvementArea": "increase_resolution_rate"
  }'
```

## Database Schema

Key tables:
- `borrowers` - Borrower information
- `cases` - Collections cases
- `conversations` - Agent conversations
- `messages` - Conversation transcripts
- `conversation_scores` - Evaluation metrics
- `prompt_variants` - Prompt versions
- `cost_log` - API cost tracking
- `evaluation_disagreements` - Meta-evaluation findings

See `scripts/001_schema.sql` for full schema.

## Docker Deployment

Build and run with Docker:
```bash
docker-compose up --build
```

Then access at `http://localhost:3000`

## Testing & Evaluation

Run evaluation suite:
```bash
pnpm run eval
```

This will:
1. Generate 10 simulated borrower scenarios (seeded)
2. Run agents through 3-phase pipeline
3. Calculate metrics for each conversation
4. Compare against baseline
5. Generate evolution report

Results saved to `evaluations/` folder with timestamp.

## Troubleshooting

### API Key Errors
Ensure all env vars are set in Vercel project settings (or `.env.local` locally).

### Database Connection Issues
- For Supabase: check URL and keys are correct
- For Docker: ensure `docker-compose up` ran successfully
- Check `SUPABASE_SERVICE_ROLE_KEY` is set (needed for admin access)

### Token Budget Exceeded
Agents are hitting 2000 token limit. Check:
- System prompt length
- Conversation history length
- Consider shortening system prompt

### Compliance Score Low
Meta-evaluator may have found issues. Check:
- `/api/evaluation/meta-report` for disagreements
- Ensure prompts don't violate 8 FDCPA rules
- Verify test data is realistic

## Performance Considerations

- **Supabase**: Indexes created on common query fields
- **Token Efficiency**: ~1 token per 4 characters
- **Evaluation Time**: ~5 seconds per 10 conversations
- **Cost**: ~$0.05 per 10-conversation batch

## Security

- Service role key used only for admin operations
- Anon key used for client operations
- All data validated before insert
- No PII logged to console

## Future Enhancements

- [ ] Integrate actual Temporal for production orchestration
- [ ] Add Vapi voice agent integration
- [ ] Multi-language support (Spanish priority)
- [ ] Borrower-side interface for payments
- [ ] Legal integration for escalation
- [ ] Real-time monitoring dashboard
- [ ] Advanced metrics (borrower sentiment, negotiation patterns)

## Support

For issues or questions, see DECISION_JOURNAL.md for architecture decisions and tradeoffs.
