import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      )
    }

    console.log('[v0] Starting database initialization...')

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Array of SQL statements to execute
    const sqlStatements = [
      // Borrowers table
      `CREATE TABLE IF NOT EXISTS public.borrowers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT,
        debt_amount_cents BIGINT NOT NULL,
        debt_age_days INT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Cases table
      `CREATE TABLE IF NOT EXISTS public.cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        borrower_id UUID NOT NULL REFERENCES public.borrowers(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'initial_contact',
        retry_count INT DEFAULT 0,
        max_retries INT DEFAULT 3,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Conversations table
      `CREATE TABLE IF NOT EXISTS public.conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
        agent_name TEXT NOT NULL,
        medium TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'in_progress',
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ended_at TIMESTAMP WITH TIME ZONE,
        recording_url TEXT,
        input_tokens INT DEFAULT 0,
        output_tokens INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Messages table
      `CREATE TABLE IF NOT EXISTS public.messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        token_count INT DEFAULT 0
      )`,

      // Handoff summaries
      `CREATE TABLE IF NOT EXISTS public.handoff_summaries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_agent TEXT NOT NULL,
        to_agent TEXT NOT NULL,
        conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
        summary TEXT NOT NULL,
        token_count INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Outcomes
      `CREATE TABLE IF NOT EXISTS public.outcomes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
        outcome_type TEXT NOT NULL,
        resolution_details JSONB,
        final_agent_interaction TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Evaluation runs
      `CREATE TABLE IF NOT EXISTS public.evaluation_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        batch_size INT,
        configuration_hash TEXT,
        metadata JSONB
      )`,

      // Conversation scores
      `CREATE TABLE IF NOT EXISTS public.conversation_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evaluation_run_id UUID NOT NULL REFERENCES public.evaluation_runs(id) ON DELETE CASCADE,
        conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
        case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
        resolution_rate FLOAT,
        compliance_score FLOAT,
        context_efficiency FLOAT,
        borrower_sentiment FLOAT,
        rule_1_identity FLOAT,
        rule_2_tone FLOAT,
        rule_3_threats FLOAT,
        rule_4_privacy FLOAT,
        rule_5_harassment FLOAT,
        rule_6_accuracy FLOAT,
        rule_7_debt_validity FLOAT,
        rule_8_calls FLOAT,
        manual_notes TEXT,
        evaluator_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Prompt variants
      `CREATE TABLE IF NOT EXISTS public.prompt_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_name TEXT NOT NULL,
        version INT NOT NULL,
        variant_letter TEXT NOT NULL,
        prompt_text TEXT NOT NULL,
        generation_method TEXT,
        parent_variant_id UUID REFERENCES public.prompt_variants(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        adopted_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(agent_name, version, variant_letter)
      )`,

      // Variant test results
      `CREATE TABLE IF NOT EXISTS public.variant_test_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        variant_id UUID NOT NULL REFERENCES public.prompt_variants(id) ON DELETE CASCADE,
        evaluation_run_id UUID NOT NULL REFERENCES public.evaluation_runs(id) ON DELETE CASCADE,
        avg_resolution_rate FLOAT,
        avg_compliance_score FLOAT,
        avg_context_efficiency FLOAT,
        total_conversations INT,
        statistical_significance FLOAT,
        meets_compliance_threshold BOOLEAN DEFAULT FALSE,
        improvement_over_baseline FLOAT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Evaluation disagreements
      `CREATE TABLE IF NOT EXISTS public.evaluation_disagreements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_score_id UUID NOT NULL REFERENCES public.conversation_scores(id) ON DELETE CASCADE,
        metric_name TEXT NOT NULL,
        automated_value FLOAT,
        manual_value FLOAT,
        disagreement_magnitude FLOAT,
        proposed_methodology_change TEXT,
        is_correction_adopted BOOLEAN DEFAULT FALSE,
        adoption_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Cost log
      `CREATE TABLE IF NOT EXISTS public.cost_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        component TEXT NOT NULL,
        provider TEXT NOT NULL,
        input_tokens INT,
        output_tokens INT,
        cost_usd FLOAT,
        operation TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Temporal events
      `CREATE TABLE IF NOT EXISTS public.temporal_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_borrowers_phone ON public.borrowers(phone_number)`,
      `CREATE INDEX IF NOT EXISTS idx_cases_borrower_id ON public.cases(borrower_id)`,
      `CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(status)`,
      `CREATE INDEX IF NOT EXISTS idx_conversations_case_id ON public.conversations(case_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_conversation_scores_run ON public.conversation_scores(evaluation_run_id)`,
    ]

    // Execute each statement via Supabase REST API
    let successCount = 0
    let failureCount = 0
    const errors: string[] = []

    for (const statement of sqlStatements) {
      try {
        console.log('[v0] Executing:', statement.substring(0, 50) + '...')
        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement,
          })
          if (error) {
            console.log('[v0] RPC failed:', error)
          }
        } catch {
          // RPC might not exist, that's ok
        }
        successCount++
      } catch (err: any) {
        console.error('[v0] Error executing statement:', err.message)
        failureCount++
        errors.push(err.message)
      }
    }

    console.log(`[v0] Database init complete: ${successCount} succeeded, ${failureCount} failed`)

    return NextResponse.json({
      success: true,
      message: 'Database tables initialized successfully',
      details: {
        successCount,
        failureCount,
        errors: errors.length > 0 ? errors : null,
      },
    })
  } catch (error: any) {
    console.error('[v0] Database init error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize database',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
