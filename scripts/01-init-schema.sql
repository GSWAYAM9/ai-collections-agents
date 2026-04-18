-- Collections AI System Database Schema

-- ============================================================================
-- BORROWER & CASE MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS borrowers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  debt_amount_cents BIGINT NOT NULL, -- in cents
  debt_age_days INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'initial_contact', -- initial_contact, assessment, resolution, legal, resolved
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CONVERSATIONS & TRANSCRIPTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL, -- 'assessment', 'resolution', 'final_notice'
  medium TEXT NOT NULL, -- 'chat' or 'voice'
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, completed, failed
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  
  -- Audio URL for voice calls (Vapi)
  recording_url TEXT,
  
  -- Token usage tracking
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  token_count INT DEFAULT 0
);

-- ============================================================================
-- HANDOFF SUMMARIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS handoff_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent TEXT NOT NULL, -- agent handing off
  to_agent TEXT NOT NULL, -- agent receiving
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL, -- max 500 tokens
  token_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- OUTCOMES & RESOLUTION
-- ============================================================================

CREATE TABLE IF NOT EXISTS outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  outcome_type TEXT NOT NULL, -- 'agreement_reached', 'no_deal', 'legal_flag', 'exhausted'
  resolution_details JSONB, -- flexible for different outcome types
  final_agent_interaction TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- EVALUATION METRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  batch_size INT, -- how many test cases
  configuration_hash TEXT, -- hash of agent prompts used
  metadata JSONB -- any other run metadata
);

CREATE TABLE IF NOT EXISTS conversation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_run_id UUID NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Core metrics
  resolution_rate FLOAT, -- 0-1: did conversation achieve intended goal
  compliance_score FLOAT, -- 0-100: how well did agent follow compliance rules
  context_efficiency FLOAT, -- 0-1: tokens used vs. effectiveness
  borrower_sentiment FLOAT, -- -1 to 1: estimated sentiment from transcript
  
  -- Compliance breakdown (each 0-100)
  rule_1_identity FLOAT, -- Disclosed agent identity
  rule_2_tone FLOAT, -- Professional, respectful tone
  rule_3_threats FLOAT, -- No false/illegal threats
  rule_4_privacy FLOAT, -- No PII leaks
  rule_5_harassment FLOAT, -- No abusive/harassing content
  rule_6_accuracy FLOAT, -- Accurate debt info
  rule_7_debt_validity FLOAT, -- Doesn't claim old/invalid debt
  rule_8_calls FLOAT, -- Call times/frequency compliant
  
  -- Manual evaluation (for meta-evaluation)
  manual_notes TEXT,
  evaluator_id TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PROMPT MANAGEMENT (Self-learning)
-- ============================================================================

CREATE TABLE IF NOT EXISTS prompt_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL, -- 'assessment', 'resolution', 'final_notice'
  version INT NOT NULL,
  variant_letter TEXT NOT NULL, -- 'A', 'B', 'C', etc.
  prompt_text TEXT NOT NULL,
  generation_method TEXT, -- 'baseline', 'llm_generated', 'human_edited'
  parent_variant_id UUID REFERENCES prompt_variants(id),
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  adopted_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(agent_name, version, variant_letter)
);

CREATE TABLE IF NOT EXISTS variant_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES prompt_variants(id) ON DELETE CASCADE,
  evaluation_run_id UUID NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
  
  avg_resolution_rate FLOAT,
  avg_compliance_score FLOAT,
  avg_context_efficiency FLOAT,
  total_conversations INT,
  
  statistical_significance FLOAT, -- p-value or confidence level
  meets_compliance_threshold BOOLEAN DEFAULT FALSE, -- >= 98%
  improvement_over_baseline FLOAT, -- percentage improvement
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- META-EVALUATION (Darwin-Godel)
-- ============================================================================

CREATE TABLE IF NOT EXISTS evaluation_disagreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_score_id UUID NOT NULL REFERENCES conversation_scores(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL, -- e.g., 'compliance_score', 'rule_3_threats'
  automated_value FLOAT,
  manual_value FLOAT,
  disagreement_magnitude FLOAT, -- |automated - manual|
  
  -- Proposed correction
  proposed_methodology_change TEXT,
  is_correction_adopted BOOLEAN DEFAULT FALSE,
  adoption_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- COST TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS cost_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL, -- 'assessment_agent', 'resolution_agent', 'final_notice_agent', 'evaluation', 'prompt_generation', etc.
  provider TEXT NOT NULL, -- 'anthropic', 'vapi', 'temporal'
  input_tokens INT,
  output_tokens INT,
  cost_usd FLOAT,
  operation TEXT, -- 'conversation', 'evaluation', 'generation'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TEMPORAL WORKFLOW EVENTS (for debugging/audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS temporal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'started', 'activity_scheduled', 'activity_completed', 'retry', 'failed', 'completed'
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_cases_borrower_id ON cases(borrower_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_conversations_case_id ON conversations(case_id);
CREATE INDEX idx_conversations_agent_name ON conversations(agent_name);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_outcomes_case_id ON outcomes(case_id);
CREATE INDEX idx_evaluation_runs_timestamp ON evaluation_runs(run_timestamp);
CREATE INDEX idx_conversation_scores_eval_run ON conversation_scores(evaluation_run_id);
CREATE INDEX idx_conversation_scores_case ON conversation_scores(case_id);
CREATE INDEX idx_prompt_variants_agent_adopted ON prompt_variants(agent_name, adopted_at);
CREATE INDEX idx_cost_log_component ON cost_log(component);
CREATE INDEX idx_temporal_events_case ON temporal_events(case_id);

-- Enable RLS (if needed in future)
-- ALTER TABLE borrowers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
