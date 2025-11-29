import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig } from './publicConfig'

let browserClient: SupabaseClient | null = null

export function createSupabaseBrowserClient(): SupabaseClient {
  const { url, anonKey } = getSupabasePublicConfig()
  if (!url || !anonKey) {
    throw new Error('Missing Supabase public configuration.')
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, anonKey)
  }
  return browserClient
}
