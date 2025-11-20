import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from './config'

let browserClient: SupabaseClient | null = null

export function createSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey)
  }
  return browserClient
}
