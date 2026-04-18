/**
 * Environment configuration for the collections AI system
 */

export const config = {
  // Anthropic
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: 'claude-3-5-sonnet-20241022', // or latest available

  // Vapi (Voice provider)
  vapiApiKey: process.env.VAPI_API_KEY || '',

  // Supabase
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Temporal (optional, for production)
  temporalEndpoint: process.env.TEMPORAL_ENDPOINT || 'localhost:7233',
  temporalNamespace: process.env.TEMPORAL_NAMESPACE || 'collections-ai',

  // Feature flags
  enableVoiceAgent: process.env.ENABLE_VOICE_AGENT === 'true',
  enableEvaluationLoop: process.env.ENABLE_EVALUATION_LOOP === 'true',
  maxCostBudgetCents: parseInt(process.env.MAX_COST_BUDGET_CENTS || '200000', 10), // $2000

  // Testing
  testMode: process.env.NODE_ENV === 'test',
}

/**
 * Validate configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.anthropicApiKey) {
    errors.push('ANTHROPIC_API_KEY is not set')
  }

  if (!config.supabaseUrl) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is not set')
  }

  if (!config.supabaseAnonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
  }

  if (!config.supabaseServiceKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  if (config.enableVoiceAgent && !config.vapiApiKey) {
    errors.push('VAPI_API_KEY is not set but ENABLE_VOICE_AGENT is true')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get configuration with validation
 */
export function getConfig() {
  const validation = validateConfig()
  if (!validation.valid) {
    console.error('Configuration validation failed:', validation.errors)
    throw new Error(`Configuration invalid: ${validation.errors.join(', ')}`)
  }
  return config
}
