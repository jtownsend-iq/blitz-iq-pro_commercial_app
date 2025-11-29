const isTest =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  process.env.JEST_WORKER_ID !== undefined

export function getSupabasePublicConfig(): { url: string; anonKey: string } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if ((!supabaseUrl || !supabaseAnonKey) && !isTest) {
    throw new Error(
      'Missing Supabase client configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    )
  }

  return {
    url: supabaseUrl ?? '',
    anonKey: supabaseAnonKey ?? '',
  }
}

export const supabasePublicConfig = getSupabasePublicConfig()
