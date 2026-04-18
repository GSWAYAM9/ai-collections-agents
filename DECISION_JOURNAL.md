# Collections AI System - Decision Journal

This document records architectural decisions, tradeoffs, and lessons learned.

## Decision 1: Multi-Agent Pipeline vs Single Agent

**Decision**: Use 3-agent pipeline (Assessment → Resolution → Final Notice)

**Rationale**:
- Specialization enables better performance per phase
- Clear handoff points for retry logic
- Allows different modalities (chat vs voice)
- Easier to test and improve individual agents

**Alternative Considered**: Single versatile agent
- Pro: Simpler, fewer context switches
- Con: Single point of failure, harder to optimize specific phases

**Lesson**: Separation of concerns wins even at coordination cost.

---

## Decision 2: Token Budget Hard Limits (2000 tokens/agent)

**Decision**: Enforce hard 2000-token budget per agent with fail-fast

**Rationale**:
- Prevents cost overruns
- Forces clarity and conciseness
- Production-grade constraint
- Easy to test against

**Implementation**: TokenManager throws error when budget exceeded

**Alternative Considered**: Soft limits with warnings
- Pro: More flexible, fewer failures
- Con: Hard to control costs, easier to exceed budget

**Lesson**: Hard constraints force better design upfront.

---

## Decision 3: LLM-Based Compliance Checking

**Decision**: Use rule-based compliance checker, not LLM-based

**Rationale**:
- Faster, more consistent, deterministic
- Lower cost ($0 vs $0.001+)
- Easy to audit and explain
- 8 FDCPA rules map naturally to regex + heuristics

**Alternative Considered**: Use Claude for compliance scoring
- Pro: More nuanced, catches edge cases
- Con: Expensive, non-deterministic, hard to debug

**Lesson**: Not every problem needs AI. Simple rules can be very effective.

---

## Decision 4: Supabase as Primary Database

**Decision**: Use Supabase for all data persistence

**Rationale**:
- Full PostgreSQL feature set
- Built-in auth (even if not used)
- RLS support (for future)
- Good integration with Next.js
- Easy to query for evaluation

**Alternative Considered**: Local file-based system
- Pro: Simpler for MVP, portable
- Con: Hard to query, doesn't scale

**Lesson**: Database queries needed for evaluation/analysis make cloud DB worth it.

---

## Decision 5: Simulated Borrower Scenarios for Testing

**Decision**: Use deterministic simulated borrower responses

**Rationale**:
- Fast (no human input needed)
- Repeatable (seeded randomness)
- Cheap (no API calls)
- Enables continuous evaluation

**Alternative Considered**: Real borrower calls
- Pro: Realistic data
- Con: Expensive, slow, needs consent

**Lesson**: Simulation lets you iterate rapidly before real-world testing.

---

## Decision 6: Meta-Evaluation (Darwin-Godel)

**Decision**: System audits its own evaluation methodology

**Rationale**:
- Catches systematic bias in metrics
- Enables self-improvement beyond prompts
- Tracks when corrections are adopted
- Documents evolution of methodology

**How It Works**:
1. Compare automated scores vs manual review
2. Find disagreements > threshold (15%)
3. Propose methodology changes
4. Track which corrections were adopted

**Cost**: ~$0.01 per disagreement review

**Lesson**: Meta-evaluation adds overhead but catches real issues.

---

## Decision 7: Anthropic Claude vs Other Models

**Decision**: Use Claude 3.5 Sonnet for all agents

**Rationale**:
- Best instruction-following for our use case
- Good balance of speed/cost
- Available via AI Gateway (no key needed)
- Strong ethical guidelines built-in

**Alternative Considered**: GPT-4, Llama, Open Source
- GPT-4: Overkill cost, similar performance
- Llama: Harder to deploy, less fine-tuned
- Open Source: Might work, more ops burden

**Lesson**: Latest Claude models are very strong for structured tasks.

---

## Decision 8: Vapi for Voice Agent

**Decision**: Use Vapi for voice agent (Resolution phase)

**Rationale**:
- Handles audio I/O automatically
- Built-in speech-to-text
- Text-to-speech synthesis
- Integrates with LLMs easily
- Free tier sufficient for MVP

**Alternative Considered**: Twilio, raw WebRTC
- Twilio: More features but higher cost
- Raw WebRTC: Too much infrastructure

**Lesson**: Managed services reduce complexity.

---

## Decision 9: Temporal for Workflow Orchestration

**Decision**: Use Temporal patterns (MVP non-Temporal implementation)

**Rationale**:
- Temporal enables complex retry/recovery logic
- Activities pattern is clean abstraction
- Easy to transition to real Temporal later
- Built-in versioning support

**Current**: Implemented pattern but using async/await
**Future**: Can drop in real Temporal server when needed

**Lesson**: Design for abstraction even if you can't run full system today.

---

## Decision 10: Cost Cap at $20

**Decision**: Hard budget of $20 for full learning cycle

**Rationale**:
- Forces efficient evaluation design
- Realistic for MVP
- Discourages wasteful prompt generation
- Easy to track and monitor

**Breakdown**:
- Baseline evaluation: $0.50
- 5 prompt variants @ $0.10 each: $0.50
- Variant testing @ $0.05 each: $0.25
- Meta-evaluation: $0.10
- Buffer: $18.65

**Alternative Considered**: No budget (spend as needed)
- Pro: More freedom to iterate
- Con: No feedback on efficiency

**Lesson**: Constraints drive innovation.

---

## Lessons Learned

### 1. Specialization > Generalization
Three specialized agents beat one versatile agent. Clear boundaries help.

### 2. Simple Heuristics > Complex AI
Rule-based compliance checking is faster and more trustworthy than LLM scoring.

### 3. Constraints Drive Design
Token limits and cost caps forced us to be precise and efficient.

### 4. Abstraction Pays Off
Implementing Temporal-pattern activities (even without real Temporal) made refactoring trivial.

### 5. Simulation Enables Speed
Deterministic test cases let us iterate 100x faster than waiting for human input.

### 6. Metrics Need Auditing
Meta-evaluation caught systematic biases we would have missed.

### 7. Determinism Matters
Seeded randomness for borrower scenarios makes debugging and comparison possible.

### 8. Documentation is Part of Code
Decision journal helps future developers understand tradeoffs.

---

## Known Tradeoffs

### Tradeoff 1: Specialization vs Cohesion
- **Pro of specialization**: Better per-agent performance, clearer ownership
- **Con**: More complex handoffs, data passing between agents
- **Mitigation**: Clear handoff format (500 tokens max)

### Tradeoff 2: Rule-Based Compliance vs AI Scoring
- **Pro of rules**: Fast, consistent, auditable
- **Con**: Edge cases need manual tuning
- **Mitigation**: Meta-evaluation catches systematic issues

### Tradeoff 3: Simulated Borrowers vs Real Users
- **Pro of simulation**: Fast iteration, cheap, deterministic
- **Con**: May not capture real behavior edge cases
- **Mitigation**: Plan transition to real users after MVP validation

### Tradeoff 4: Supabase Persistence vs Local Files
- **Pro of Supabase**: Queryable, scalable, shared
- **Con**: Requires cloud account, small latency
- **Mitigation**: Keep local evaluation cache for offline work

---

## Future Decisions to Make

1. **Real Temporal or StepFunctions?** Currently using async/await pattern
2. **Multi-language support?** Start with English, expand later
3. **Borrower UI?** When to build payment interface
4. **Legal integration?** How to escalate automatically
5. **Real voice calls?** When to transition from Vapi simulation

---

## Appendix: Metrics Considered But Not Implemented

- **Borrower stress level detection**: Too subjective, hard to measure
- **Negotiation skill score**: Would need separate eval model
- **Call duration efficiency**: Not meaningful with simulated data
- **Borrower satisfaction**: No feedback channel yet
- **Payment follow-through rate**: Need post-call data
