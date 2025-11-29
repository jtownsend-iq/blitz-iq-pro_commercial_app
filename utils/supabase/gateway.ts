'use server'

import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { env } from '@/utils/env'
import { getSupabasePublicConfig } from './publicConfig'

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabasePublicConfig()
const supabaseServiceRoleKey = env.supabaseServiceRoleKey

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration is missing. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set.')
}

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  serviceRoleKey: supabaseServiceRoleKey,
} as const

let browserClient: SupabaseClient | null = null

export function createSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey)
  }
  return browserClient
}

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  return createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
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
  if (!supabaseConfig.serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. This key is required for privileged Supabase operations.')
  }

  return createSupabaseAdminClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  })
}
