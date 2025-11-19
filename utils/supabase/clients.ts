import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
  )
}

export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
} as const

export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey)
}

export async function createSupabaseServerClient() {
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

export function createSupabaseServiceRoleClient() {
  if (!supabaseConfig.serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. This key is required for privileged Supabase operations.'
    )
  }

  return createSupabaseAdminClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  })
}
