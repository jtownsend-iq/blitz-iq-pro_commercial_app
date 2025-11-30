import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig } from './publicConfig'

let browserClient: SupabaseClient | null = null

export function createSupabaseBrowserClient(): SupabaseClient {
  const config = getSupabasePublicConfig({ allowMissingInDev: true })
  if (!config) {
    throw new Error(
      'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).'
    )
  }

  if (!browserClient) {
    browserClient = createBrowserClient(config.url, config.anonKey)
  }
  return browserClient
}
