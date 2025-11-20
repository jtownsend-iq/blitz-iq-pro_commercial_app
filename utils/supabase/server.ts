import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { supabaseConfig } from './config'

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
