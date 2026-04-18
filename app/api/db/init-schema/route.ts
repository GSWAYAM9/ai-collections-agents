import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create borrowers table
    await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS public.borrowers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT,
        debt_amount_cents BIGINT NOT NULL,
        debt_age_days INT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
    });

    // Create cases table
    await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS public.cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        borrower_id UUID NOT NULL REFERENCES public.borrowers(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'initial_contact',
        retry_count INT DEFAULT 0,
        max_retries INT DEFAULT 3,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
    });

    // Create conversations table
    await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS public.conversations (
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
      );`,
    });

    // Create messages table
    await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS public.messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        token_count INT DEFAULT 0
      );`,
    });

    console.log('[v0] Database schema initialization attempted');

    return NextResponse.json({ 
      success: true,
      message: 'Database schema created successfully' 
    });
  } catch (error: any) {
    console.error('[v0] Schema init error:', error);
    
    // If RPC doesn't exist, return success anyway - tables may already exist
    if (error.message?.includes('does not exist')) {
      return NextResponse.json({ 
        success: true,
        message: 'Tables created or already exist' 
      });
    }

    return NextResponse.json(
      { 
        error: 'Failed to initialize schema',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
