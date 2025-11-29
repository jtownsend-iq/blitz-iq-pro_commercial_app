import test from 'node:test'
import assert from 'node:assert/strict'

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'anon-key'

test('resolveSupabasePublicConfig throws when missing outside test', async () => {
  const { resolveSupabasePublicConfig } = await import('../../utils/supabase/publicConfig')
  const vars = { NODE_ENV: 'development' } as NodeJS.ProcessEnv
  assert.throws(() => resolveSupabasePublicConfig(vars), /Missing Supabase client configuration/)
})

test('resolveSupabasePublicConfig returns values when provided', async () => {
  const { resolveSupabasePublicConfig } = await import('../../utils/supabase/publicConfig')
  const vars = {
    NODE_ENV: 'development',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'anon-key',
  } as NodeJS.ProcessEnv
  const cfg = resolveSupabasePublicConfig(vars)
  assert.equal(cfg.url, vars.NEXT_PUBLIC_SUPABASE_URL)
  assert.equal(cfg.anonKey, vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
})
