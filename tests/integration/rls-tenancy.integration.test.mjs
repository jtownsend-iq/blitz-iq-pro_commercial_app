import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load local env for test runs (staging/local Supabase credentials)
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const testEmail = process.env.TEST_EMAIL
const testPassword = process.env.TEST_PASSWORD
const memberTeamId = process.env.TEST_TEAM_ID
const otherTeamId = process.env.TEST_TEAM_ID_ALT

const missingEnv = [
  ['NEXT_PUBLIC_SUPABASE_URL', supabaseUrl],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', anonKey],
  ['SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey],
  ['TEST_EMAIL', testEmail],
  ['TEST_PASSWORD', testPassword],
  ['TEST_TEAM_ID', memberTeamId],
  ['TEST_TEAM_ID_ALT', otherTeamId],
]
  .filter(([, value]) => !value)
  .map(([key]) => key)

const shouldRun = process.env.RUN_SUPABASE_RLS_TESTS !== 'false' && missingEnv.length === 0

const t = shouldRun &&
  supabaseUrl &&
  anonKey &&
  serviceRoleKey &&
  testEmail &&
  testPassword &&
  memberTeamId &&
  otherTeamId
  ? test
  : test.skip

if (!shouldRun && missingEnv.length) {
  console.warn(`Skipping RLS tests; missing env: ${missingEnv.join(', ')}`)
}

async function getAuthedClient() {
  const authClient = createClient(supabaseUrl, anonKey)
  const { data, error } = await authClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })
  assert.equal(error, null, `Auth failed: ${error?.message}`)
  const token = data.session?.access_token
  assert.ok(token, 'No access token returned')
  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

t('RLS allows member to read own team rows and blocks cross-team writes', async () => {
  const client = await getAuthedClient()

  const readRes = await client.from('scout_views').select('id').eq('team_id', memberTeamId).limit(1)
  assert.equal(readRes.error, null, `Expected read to succeed: ${readRes.error?.message}`)

  const crossTeamInsert = await client.from('scout_views').insert({
    team_id: otherTeamId,
    name: 'rls_cross_team_guard',
    filters: {},
  })
  assert.ok(
    crossTeamInsert.error,
    'Expected cross-team insert to be blocked by RLS (got success instead)'
  )
})

t('RLS blocks cross-team RPC calls', async () => {
  const client = await getAuthedClient()
  const res = await client.rpc('get_scout_recent', {
    p_team: otherTeamId,
    p_opponent: 'rls-test',
    p_season: '9999',
    p_limit: 1,
    p_offset: 0,
    p_tags: null,
    p_tag_logic: 'OR',
    p_hash: null,
    p_field_bucket: null,
  })
  assert.ok(res.error, 'Expected RPC to be denied for non-member team')
})

t('Service role can bypass RLS for maintenance tasks', async () => {
  const svc = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const { error } = await svc
    .from('audit_logs')
    .insert({ team_id: memberTeamId, action: 'rls_test_service_role' })
  assert.equal(error, null, `Service role insert failed: ${error?.message}`)
})
