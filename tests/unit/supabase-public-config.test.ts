import test from 'node:test'
import assert from 'node:assert/strict'

const setEnv = (key: string, value?: string) => {
  if (value === undefined) {
    delete (process.env as Record<string, string | undefined>)[key]
    return
  }
  ;(process.env as Record<string, string | undefined>)[key] = value
}

const loadConfig = async () => {
  const mod = await import(`../../utils/supabase/publicConfig?ts=${Date.now()}`)
  return mod.getSupabasePublicConfig
}

test('getSupabasePublicConfig throws when missing in production', async () => {
  const getSupabasePublicConfig = await loadConfig()
  const originalEnv = { ...process.env }
  setEnv('NODE_ENV', 'production')
  setEnv('NEXT_PUBLIC_SUPABASE_URL', undefined)
  setEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', undefined)
  setEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', undefined)
  assert.throws(
    () => getSupabasePublicConfig({ allowMissingInDev: false }),
    /Missing Supabase client configuration/
  )
  Object.assign(process.env, originalEnv)
})

test('getSupabasePublicConfig returns null when allowed in dev', async () => {
  const getSupabasePublicConfig = await loadConfig()
  const originalEnv = { ...process.env }
  setEnv('NODE_ENV', 'development')
  setEnv('NEXT_PUBLIC_SUPABASE_URL', undefined)
  setEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', undefined)
  setEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', undefined)
  const cfg = getSupabasePublicConfig({ allowMissingInDev: true })
  assert.equal(cfg, null)
  Object.assign(process.env, originalEnv)
})

test('getSupabasePublicConfig returns canonical anon key when present', async () => {
  const getSupabasePublicConfig = await loadConfig()
  const originalEnv = { ...process.env }
  setEnv('NODE_ENV', 'development')
  setEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  setEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
  setEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', undefined)
  const cfg = getSupabasePublicConfig()
  assert.equal(cfg?.url, 'https://example.supabase.co')
  assert.equal(cfg?.anonKey, 'anon-key')
  Object.assign(process.env, originalEnv)
})

test('getSupabasePublicConfig falls back to publishable key when anon key missing', async () => {
  const getSupabasePublicConfig = await loadConfig()
  const originalEnv = { ...process.env }
  setEnv('NODE_ENV', 'development')
  setEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  setEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', undefined)
  setEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'legacy-publishable')
  const cfg = getSupabasePublicConfig()
  assert.equal(cfg?.anonKey, 'legacy-publishable')
  Object.assign(process.env, originalEnv)
})
