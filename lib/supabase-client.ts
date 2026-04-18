import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration')
}

// Browser client (for client-side operations)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server client (for server-side operations with service role)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase

// Helper to insert conversation data
export async function insertConversation(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('conversations')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}

// Helper to insert message
export async function insertMessage(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('messages')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}

// Helper to get case with borrower
export async function getCaseWithBorrower(caseId: string) {
  const { data, error } = await supabaseAdmin
    .from('cases')
    .select('*, borrowers(*)')
    .eq('id', caseId)
    .single()
  if (error) throw error
  return data
}

// Helper to get conversations for case
export async function getCaseConversations(caseId: string) {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Helper to get messages for conversation
export async function getConversationMessages(conversationId: string) {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true })
  if (error) throw error
  return data
}

// Helper to log cost
export async function logCost(data: any) {
  const { error } = await supabaseAdmin.from('cost_log').insert([data])
  if (error) throw error
}

// Helper to create evaluation run
export async function createEvaluationRun(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('evaluation_runs')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}

// Helper to insert conversation scores
export async function insertConversationScores(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('conversation_scores')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}
