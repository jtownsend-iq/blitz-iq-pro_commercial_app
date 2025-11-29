import test from 'node:test'
import assert from 'node:assert/strict'

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key'

test('buildEnv throws when required env is missing outside test mode', async () => {
  const { buildEnv } = await import('../../utils/env')
  const vars = { NODE_ENV: 'development' } as NodeJS.ProcessEnv
  assert.throws(() => buildEnv(vars, { allowMissingInTest: false }), /NEXT_PUBLIC_SUPABASE_URL/)
})

test('buildEnv returns provided values and keeps optionals undefined', async () => {
  const { buildEnv } = await import('../../utils/env')
  const vars = {
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  } as NodeJS.ProcessEnv
  const env = buildEnv(vars, { allowMissingInTest: false })
  assert.equal(env.supabaseUrl, vars.NEXT_PUBLIC_SUPABASE_URL)
  assert.equal(env.supabaseAnonKey, vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  assert.equal(env.supabaseServiceRoleKey, vars.SUPABASE_SERVICE_ROLE_KEY)
  assert.equal(env.stripeSecretKey, undefined)
  assert.equal(env.telemetryVerifyToken, undefined)
})
