#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[v0] Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function initializeSchema() {
  console.log('[v0] Initializing database schema...');

  try {
    // Create borrowers table
    const { error: borrowersError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS borrowers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          email TEXT,
          debt_amount_cents INTEGER NOT NULL,
          debt_age_days INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_borrowers_phone ON borrowers(phone_number);
      `
    });

    if (borrowersError) {
      console.error('[v0] Borrowers table error:', borrowersError);
    } else {
      console.log('[v0] Borrowers table created');
    }

    // Create cases table
    const { error: casesError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS cases (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          borrower_id UUID NOT NULL REFERENCES borrowers(id),
          status TEXT DEFAULT 'initial_contact',
          retry_count INTEGER DEFAULT 0,
          max_retries INTEGER DEFAULT 3,
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_cases_borrower ON cases(borrower_id);
        CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
      `
    });

    if (casesError) {
      console.error('[v0] Cases table error:', casesError);
    } else {
      console.log('[v0] Cases table created');
    }

    // Create conversations table
    const { error: conversationsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          case_id UUID NOT NULL REFERENCES cases(id),
          agent_name TEXT NOT NULL,
          medium TEXT DEFAULT 'chat',
          status TEXT DEFAULT 'in_progress',
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_conversations_case ON conversations(case_id);
      `
    });

    if (conversationsError) {
      console.error('[v0] Conversations table error:', conversationsError);
    } else {
      console.log('[v0] Conversations table created');
    }

    // Create messages table
    const { error: messagesError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id),
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      `
    });

    if (messagesError) {
      console.error('[v0] Messages table error:', messagesError);
    } else {
      console.log('[v0] Messages table created');
    }

    console.log('[v0] Database schema initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[v0] Database initialization error:', error);
    process.exit(1);
  }
}

initializeSchema();
