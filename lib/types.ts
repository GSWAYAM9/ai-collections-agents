// Core types for the collections AI system

export interface Borrower {
  id: string
  phone_number: string
  name: string
  email?: string
  debt_amount_cents: number
  debt_age_days: number
  created_at: string
  updated_at: string
}

export interface Case {
  id: string
  borrower_id: string
  status: 'initial_contact' | 'assessment' | 'resolution' | 'legal' | 'resolved'
  retry_count: number
  max_retries: number
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  case_id: string
  agent_name: 'assessment' | 'resolution' | 'final_notice'
  medium: 'chat' | 'voice'
  status: 'in_progress' | 'completed' | 'failed'
  started_at: string
  ended_at?: string
  recording_url?: string
  input_tokens: number
  output_tokens: number
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  token_count: number
}

export interface HandoffSummary {
  id: string
  from_agent: string
  to_agent: string
  conversation_id: string
  summary: string
  token_count: number
  created_at: string
}

export interface Outcome {
  id: string
  case_id: string
  outcome_type: 'agreement_reached' | 'no_deal' | 'legal_flag' | 'exhausted'
  resolution_details?: Record<string, any>
  final_agent_interaction?: string
  created_at: string
}

export interface ConversationScore {
  id: string
  evaluation_run_id: string
  conversation_id: string
  case_id: string
  resolution_rate: number
  compliance_score: number
  context_efficiency: number
  borrower_sentiment: number
  rule_1_identity: number
  rule_2_tone: number
  rule_3_threats: number
  rule_4_privacy: number
  rule_5_harassment: number
  rule_6_accuracy: number
  rule_7_debt_validity: number
  rule_8_calls: number
  manual_notes?: string
  evaluator_id?: string
  created_at: string
}

export interface PromptVariant {
  id: string
  agent_name: 'assessment' | 'resolution' | 'final_notice'
  version: number
  variant_letter: string
  prompt_text: string
  generation_method: 'baseline' | 'llm_generated' | 'human_edited'
  parent_variant_id?: string
  created_at: string
  adopted_at?: string
}

export interface VariantTestResult {
  id: string
  variant_id: string
  evaluation_run_id: string
  avg_resolution_rate: number
  avg_compliance_score: number
  avg_context_efficiency: number
  total_conversations: number
  statistical_significance: number
  meets_compliance_threshold: boolean
  improvement_over_baseline: number
  created_at: string
}

export interface CostLog {
  id: string
  component: string
  provider: 'anthropic' | 'vapi' | 'temporal'
  input_tokens?: number
  output_tokens?: number
  cost_usd: number
  operation: string
  metadata?: Record<string, any>
  created_at: string
}

// Agent message types
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  token_count?: number
}

// Context budget tracking
export interface ContextBudget {
  agent: string
  max_tokens: number
  used_tokens: number
  remaining_tokens: number
  exceeded: boolean
}

// Compliance rule structure
export interface ComplianceRule {
  id: number
  name: string
  description: string
  check: (transcript: string, metadata: any) => number // Returns 0-100 score
}

// Evaluation metrics
export interface EvaluationMetrics {
  resolution_rate: number // 0-1
  compliance_score: number // 0-100
  context_efficiency: number // 0-1
  borrower_sentiment: number // -1 to 1
  compliance_breakdown: {
    rule_1_identity: number
    rule_2_tone: number
    rule_3_threats: number
    rule_4_privacy: number
    rule_5_harassment: number
    rule_6_accuracy: number
    rule_7_debt_validity: number
    rule_8_calls: number
  }
}
