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

// ---------------------------------------------------------------------------
// Self-learning + meta-evaluation helpers
// ---------------------------------------------------------------------------

// Get the currently adopted prompt variant for an agent (latest adopted)
export async function getAdoptedVariant(agentName: string) {
  const { data, error } = await supabaseAdmin
    .from('prompt_variants')
    .select('*')
    .eq('agent_name', agentName)
    .not('adopted_at', 'is', null)
    .order('version', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0] ?? null
}

// Get the highest version number stored for an agent
export async function getMaxVariantVersion(agentName: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('prompt_variants')
    .select('version')
    .eq('agent_name', agentName)
    .order('version', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.version ?? 0
}

export async function insertPromptVariant(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('prompt_variants')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}

export async function adoptVariant(variantId: string) {
  const { error } = await supabaseAdmin
    .from('prompt_variants')
    .update({ adopted_at: new Date().toISOString() })
    .eq('id', variantId)
  if (error) throw error
}

export async function insertVariantTestResult(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('variant_test_results')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}

export async function insertDisagreement(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('evaluation_disagreements')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}

export async function insertTemporalEvent(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('temporal_events')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}

export async function getTemporalEvents(workflowId: string) {
  const { data, error } = await supabaseAdmin
    .from('temporal_events')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}
