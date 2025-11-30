// Supabase public config expects NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY as the canonical names.
// Legacy fallback: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (used earlier in this repo and env files).
// If these are missing in production, we throw a clear error; in dev/test callers may opt into a lenient warning.

type SupabasePublicConfig = { url: string; anonKey: string }

type ConfigOptions = {
  allowMissingInDev?: boolean
}

function isProd(vars: NodeJS.ProcessEnv) {
  return vars.NODE_ENV === 'production'
}

function resolveSupabasePublicConfig(
  vars: NodeJS.ProcessEnv,
  options: ConfigOptions = {}
): SupabasePublicConfig | null {
  const { allowMissingInDev = false } = options
  const supabaseUrl = vars.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey =
    vars.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ''

  const missing: string[] = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)')

  const hasMissing = missing.length > 0

  if (hasMissing && isProd(vars)) {
    throw new Error(
      `Missing Supabase client configuration. Set ${missing.join(
        ' and '
      )}.`
    )
  }

  if (hasMissing && !isProd(vars)) {
    if (allowMissingInDev) {
      console.warn(
        `Missing Supabase client configuration (${missing.join(
          ', '
        )}). Returning null config for dev/test.`
      )
      return null
    }
    throw new Error(
      `Missing Supabase client configuration. Set ${missing.join(
        ' and '
      )}.`
    )
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  }
}

export function getSupabasePublicConfig(options?: ConfigOptions): SupabasePublicConfig | null {
  return resolveSupabasePublicConfig(process.env, options)
}
