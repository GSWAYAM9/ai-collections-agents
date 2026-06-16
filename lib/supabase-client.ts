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

// ===========================================================================
// Self-learning loop / meta-evaluation / orchestrator helpers
// (tables created in scripts/002_learning_schema.sql)
// ===========================================================================

// --- Evaluation runs & conversations ---

export async function createEvalRun(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('eval_runs')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}

export async function updateEvalRun(id: string, data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('eval_runs')
    .update(data)
    .eq('id', id)
    .select()
  if (error) throw error
  return result?.[0]
}

export async function insertEvalConversation(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('eval_conversations')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}

export async function getEvalConversations(runId: string) {
  const { data, error } = await supabaseAdmin
    .from('eval_conversations')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getRecentEvalRuns(limit = 20) {
  const { data, error } = await supabaseAdmin
    .from('eval_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

// --- Learning variants ---

export async function getAdoptedVariant(agentName: string) {
  const { data, error } = await supabaseAdmin
    .from('learning_variants')
    .select('*')
    .eq('agent_name', agentName)
    .eq('adopted', true)
    .order('version', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0] ?? null
}

export async function getMaxVariantVersion(agentName: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('learning_variants')
    .select('version')
    .eq('agent_name', agentName)
    .order('version', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.version ?? 0
}

export async function insertVariant(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('learning_variants')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}

export async function updateVariant(id: string, data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('learning_variants')
    .update(data)
    .eq('id', id)
    .select()
  if (error) throw error
  return result?.[0]
}

export async function getVariants(agentName?: string, limit = 50) {
  let query = supabaseAdmin
    .from('learning_variants')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (agentName) query = query.eq('agent_name', agentName)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// --- Meta-evaluation ---

export async function insertDisagreement(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('meta_disagreements')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}

export async function insertMetaRevision(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('meta_revisions')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}

export async function getMetaRevisions(limit = 20) {
  const { data, error } = await supabaseAdmin
    .from('meta_revisions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getDisagreements(limit = 100) {
  const { data, error } = await supabaseAdmin
    .from('meta_disagreements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

// --- Durable workflow orchestrator ---

export async function createWorkflowInstance(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('workflow_instances')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}

export async function updateWorkflowInstance(id: string, data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('workflow_instances')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
  if (error) throw error
  return result?.[0]
}

export async function getWorkflowInstance(id: string) {
  const { data, error } = await supabaseAdmin
    .from('workflow_instances')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function insertWorkflowEvent(data: any) {
  const { data: result, error } = await supabaseAdmin
    .from('workflow_events')
    .insert([data])
    .select()
  if (error) throw error
  return result?.[0]
}

export async function getWorkflowEvents(workflowId: string) {
  const { data, error } = await supabaseAdmin
    .from('workflow_events')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}
