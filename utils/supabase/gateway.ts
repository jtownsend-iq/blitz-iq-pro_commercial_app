import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { env } from '@/utils/env'
import { getSupabasePublicConfig } from './publicConfig'

type SupabaseConfig = {
  url: string
  anonKey: string
  serviceRoleKey?: string
}

let cachedConfig: SupabaseConfig | null = null
let browserClient: SupabaseClient | null = null

function requireSupabaseConfig(): SupabaseConfig {
  if (cachedConfig) return cachedConfig

  const publicConfig = getSupabasePublicConfig()
  if (!publicConfig) {
    throw new Error('Supabase configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).')
  }

  cachedConfig = {
    url: publicConfig.url,
    anonKey: publicConfig.anonKey,
    serviceRoleKey: env.supabaseServiceRoleKey,
  }

  return cachedConfig
}

export function createSupabaseBrowserClient(): SupabaseClient {
  const config = requireSupabaseConfig()

  if (!browserClient) {
    browserClient = createBrowserClient(config.url, config.anonKey)
  }
  return browserClient
}

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const config = requireSupabaseConfig()
  const cookieStore = await cookies()

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Middleware will refresh sessions so it's safe to ignore.
        }
      },
    },
  })
}

export function createSupabaseServiceRoleClient(): SupabaseClient {
  const config = requireSupabaseConfig()

  if (!config.serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. This key is required for privileged Supabase operations.')
  }

  return createSupabaseAdminClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  })
}
