-- ===========================================================================
-- Self-Learning Loop, DGM Meta-Evaluation & Durable Orchestrator Schema
-- Self-contained tables (no hard FKs to live cases/conversations) so the
-- evaluation loop can run against fully simulated conversations.
-- ===========================================================================

-- --------------------------------------------------------------------------
-- EVALUATION RUNS (one row per prompt evaluation over a batch of sims)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'baseline',
  variant_id UUID,
  num_conversations INT NOT NULL DEFAULT 0,
  compliance_rate FLOAT,
  resolution_rate FLOAT,
  avg_efficiency FLOAT,
  avg_sentiment FLOAT,
  avg_overall FLOAT,
  cost_usd FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- EVALUATION CONVERSATIONS (one row per simulated + judged conversation)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eval_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  persona TEXT,
  variant_id UUID,
  transcript JSONB,
  compliance_score FLOAT,
  resolution_achieved BOOLEAN DEFAULT FALSE,
  efficiency_score FLOAT,
  sentiment_score FLOAT,
  overall_score FLOAT,
  violations JSONB,
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- LEARNING VARIANTS (generated prompt candidates + their test outcome)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  prompt_text TEXT NOT NULL,
  rationale TEXT,
  parent_id UUID REFERENCES learning_variants(id),
  baseline_run_id UUID REFERENCES eval_runs(id),
  variant_run_id UUID REFERENCES eval_runs(id),
  improvement FLOAT,
  p_value FLOAT,
  significant BOOLEAN DEFAULT FALSE,
  meets_compliance BOOLEAN DEFAULT FALSE,
  adopted BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'generated',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  adopted_at TIMESTAMP WITH TIME ZONE
);

-- --------------------------------------------------------------------------
-- META-EVALUATION DISAGREEMENTS (DGM: independent judge re-scores)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta_disagreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES eval_conversations(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  judge_value FLOAT,
  meta_value FLOAT,
  magnitude FLOAT,
  proposed_change TEXT,
  adopted BOOLEAN DEFAULT FALSE,
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- META REVISIONS (adopted methodology corrections + recomputed deltas)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES eval_runs(id) ON DELETE SET NULL,
  num_samples INT,
  num_disagreements INT,
  mean_abs_disagreement FLOAT,
  methodology_change TEXT,
  adopted BOOLEAN DEFAULT FALSE,
  recomputed_overall FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- DURABLE WORKFLOW INSTANCES (resumable orchestrator state)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type TEXT NOT NULL DEFAULT 'collections',
  case_id UUID,
  status TEXT NOT NULL DEFAULT 'running',
  current_step TEXT,
  step_index INT DEFAULT 0,
  state JSONB DEFAULT '{}'::jsonb,
  retry_count INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- WORKFLOW EVENTS (append-only audit log for each instance)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  event_type TEXT NOT NULL,
  attempt INT DEFAULT 1,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- INDEXES
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_eval_runs_agent ON eval_runs(agent_name);
CREATE INDEX IF NOT EXISTS idx_eval_conversations_run ON eval_conversations(run_id);
CREATE INDEX IF NOT EXISTS idx_learning_variants_agent ON learning_variants(agent_name, version);
CREATE INDEX IF NOT EXISTS idx_meta_disagreements_conv ON meta_disagreements(conversation_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_wf ON workflow_events(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
