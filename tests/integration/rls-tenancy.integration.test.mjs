import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import dotenv from 'dotenv'

// Load env for Supabase URL/keys; tests self-provision fixtures.
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const missingEnv = [
  ['NEXT_PUBLIC_SUPABASE_URL', supabaseUrl],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', anonKey],
  ['SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey],
]
  .filter(([, value]) => !value)
  .map(([key]) => key)

const shouldSkip =
  process.env.RUN_SUPABASE_RLS_TESTS === 'false' || missingEnv.length > 0
    ? `Skipping RLS tests; missing env: ${missingEnv.join(', ')}`
    : null

const svc = shouldSkip
  ? null
  : createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

let fixturesPromise = null

async function provisionFixtures() {
  const email = `rls-test-${crypto.randomUUID()}@example.com`
  const password = crypto.randomUUID()
  const memberTeamId = crypto.randomUUID()
  const altTeamId = crypto.randomUUID()
  const teamSuffix = crypto.randomUUID().slice(0, 8)

  // Create user
  const { data: userData, error: userErr } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  assert.equal(userErr, null, `Failed to create test user: ${userErr?.message}`)
  const userId = userData?.user?.id
  assert.ok(userId, 'No user id returned from createUser')

  // Create teams
  const { error: teamsErr } = await svc.from('teams').insert([
    { id: memberTeamId, name: `RLS Member ${teamSuffix}` },
    { id: altTeamId, name: `RLS Alt ${teamSuffix}` },
  ])
  assert.equal(teamsErr, null, `Failed to create teams: ${teamsErr?.message}`)

  // Add membership to member team only
  const { error: memberErr } = await svc
    .from('team_members')
    .insert({ team_id: memberTeamId, user_id: userId, role: 'COACH' })
  assert.equal(memberErr, null, `Failed to add membership: ${memberErr?.message}`)

  return { email, password, userId, memberTeamId, altTeamId }
}

async function getUserClient(fixtures) {
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await authClient.auth.signInWithPassword({
    email: fixtures.email,
    password: fixtures.password,
  })
  assert.equal(error, null, `Auth failed: ${error?.message}`)
  const token = data.session?.access_token
  assert.ok(token, 'No access token returned')

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const t = shouldSkip ? test.skip : test

t('RLS allows member to read own team rows and blocks cross-team writes', async () => {
  fixturesPromise ||= provisionFixtures()
  const fixtures = await fixturesPromise
  const client = await getUserClient(fixtures)

  const readRes = await client.from('teams').select('id').eq('id', fixtures.memberTeamId).limit(1)
  assert.equal(readRes.error, null, `Expected read to succeed: ${readRes.error?.message}`)

  const crossTeamInsert = await client.from('scout_views').insert({
    team_id: fixtures.altTeamId,
    name: 'rls_cross_team_guard',
    filters: {},
  })
  assert.ok(
    crossTeamInsert.error,
    'Expected cross-team insert to be blocked by RLS (got success instead)'
  )
})

t('RLS blocks cross-team RPC calls', async () => {
  fixturesPromise ||= provisionFixtures()
  const fixtures = await fixturesPromise
  const client = await getUserClient(fixtures)

  const res = await client.rpc('get_scout_recent', {
    p_team: fixtures.altTeamId,
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
  fixturesPromise ||= provisionFixtures()
  const fixtures = await fixturesPromise
  const { error } = await svc
    .from('audit_logs')
    .insert({ team_id: fixtures.memberTeamId, action: 'rls_test_service_role' })
  assert.equal(error, null, `Service role insert failed: ${error?.message}`)
})

after(async () => {
  if (!fixturesPromise || shouldSkip) return
  const fixtures = await fixturesPromise
  try {
    await svc.from('team_members').delete().eq('user_id', fixtures.userId)
    await svc.from('teams').delete().in('id', [fixtures.memberTeamId, fixtures.altTeamId])
    await svc.auth.admin.deleteUser(fixtures.userId)
  } catch {
    // Best-effort cleanup
  }
})
