import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TEST_TEAM_ID = process.env.TEST_TEAM_ID

const shouldSkip =
  !SUPABASE_URL || !SERVICE_ROLE_KEY || !TEST_TEAM_ID
    ? `Missing env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_TEAM_ID)`
    : false

const supabase = shouldSkip ? null : createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const defaultPayload = {
  personnelOffense: ['11', '12', '20', '21', '10'],
  formationsOffense: ['Trips Right', 'Trey Left', 'Bunch', 'Empty'],
  customTags: [],
}

test('settings actions integration: chart tags + thresholds', async (t) => {
  if (shouldSkip) {
    t.skip(shouldSkip)
    return
  }

  const teamId = TEST_TEAM_ID
  const ctx = `DEFAULTS-${crypto.randomUUID()}`

  // Clean any existing defaults for this context
  const { error: deleteErr } = await supabase
    .from('chart_tags')
    .delete()
    .eq('team_id', teamId)
    .eq('context', ctx)

  assert.equal(deleteErr, null, `cleanup failed: ${deleteErr?.message}`)

  // Insert default tags (offense personnel + formations + custom)
  const rows = [
    ...defaultPayload.personnelOffense.map((label, idx) => ({
      team_id: teamId,
      label,
      category: 'PERSONNEL',
      unit: 'OFFENSE',
      sort_order: idx,
      context: ctx,
    })),
    ...defaultPayload.formationsOffense.map((label, idx) => ({
      team_id: teamId,
      label,
      category: 'FORMATION',
      unit: 'OFFENSE',
      sort_order: idx,
      context: ctx,
    })),
  ]

  const { error: insertErr } = await supabase.from('chart_tags').insert(rows)
  assert.equal(insertErr, null, `insert defaults failed: ${insertErr?.message}`)

  const { data: fetchedTags, error: fetchErr } = await supabase
    .from('chart_tags')
    .select('label, category, unit, context')
    .eq('team_id', teamId)
    .eq('context', ctx)
    .order('sort_order', { ascending: true })

  assert.equal(fetchErr, null, `fetch defaults failed: ${fetchErr?.message}`)
  assert.ok(Array.isArray(fetchedTags), 'expected tag rows')
  assert.equal(
    fetchedTags.filter((row) => row.category === 'PERSONNEL').length,
    defaultPayload.personnelOffense.length,
    'personnel count mismatch'
  )

  // Threshold upserts: null unit + offense unit
  const baseThresholds = {
    explosive_run_threshold: 12,
    explosive_pass_threshold: 18,
    success_1st_yards: 4,
    success_2nd_pct: 70,
    success_3rd_pct: 60,
    success_4th_pct: 60,
  }

  const { error: upsertNullErr } = await supabase
    .from('charting_defaults')
    .upsert([{ team_id: teamId, ...baseThresholds }], { onConflict: 'team_id' })
  assert.equal(upsertNullErr, null, `upsert null-unit thresholds failed: ${upsertNullErr?.message}`)

  const { error: upsertOffenseErr } = await supabase
    .from('charting_defaults')
    .upsert(
      [{ team_id: teamId, unit: 'OFFENSE', ...baseThresholds }],
      { onConflict: 'team_id,unit' }
    )
  assert.equal(upsertOffenseErr, null, `upsert offense thresholds failed: ${upsertOffenseErr?.message}`)

  const { data: fetchedDefaults, error: defaultsErr } = await supabase
    .from('charting_defaults')
    .select('unit, explosive_run_threshold, explosive_pass_threshold')
    .eq('team_id', teamId)
  assert.equal(defaultsErr, null, `fetch thresholds failed: ${defaultsErr?.message}`)
  assert.ok((fetchedDefaults ?? []).length >= 2, 'expected thresholds rows for null and OFFENSE units')

  // Cleanup the test context rows to keep tenant data tidy
  const { error: cleanupTagsErr } = await supabase
    .from('chart_tags')
    .delete()
    .eq('team_id', teamId)
    .eq('context', ctx)
  assert.equal(cleanupTagsErr, null, `cleanup tags failed: ${cleanupTagsErr?.message}`)

  // Do not delete charting_defaults; they are legitimate per-team settings.
})
