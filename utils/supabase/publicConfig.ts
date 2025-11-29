function isTestEnv(vars: NodeJS.ProcessEnv) {
  return (
    vars.NODE_ENV === 'test' ||
    vars.VITEST === 'true' ||
    vars.JEST_WORKER_ID !== undefined
  )
}

export function resolveSupabasePublicConfig(vars: NodeJS.ProcessEnv): { url: string; anonKey: string } {
  const supabaseUrl = vars.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
  const allowMissing = isTestEnv(vars)

  if ((!supabaseUrl || !supabaseAnonKey) && !allowMissing) {
    console.warn(
      'Missing Supabase client configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    )
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  }
}

export function getSupabasePublicConfig() {
  return resolveSupabasePublicConfig(process.env)
}

export const supabasePublicConfig = getSupabasePublicConfig()
