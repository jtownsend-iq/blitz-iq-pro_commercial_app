'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/clients'
import { POSITIONAL_GROUP_DEFAULTS } from '@/app/(app)/settings/constants'

type TeamContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
  userId: string
  teamId: string
}

async function requireTeamContext(): Promise<TeamContext> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=unauthorized')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('active_team_id')
    .eq('id', user.id)
    .maybeSingle()

  const teamId = (profile?.active_team_id as string | null) ?? null
  if (!teamId) {
    redirect('/onboarding/team')
  }

  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    redirect('/dashboard')
  }

  return { supabase, userId: user.id, teamId }
}

async function markProgress(
  supabase: TeamContext['supabase'],
  teamId: string,
  fields: Partial<{
    seeded_position_groups: boolean
    seeded_tags: boolean
    seeded_schedule: boolean
    completed_at: string | null
  }>
) {
  const payload = { team_id: teamId, ...fields }
  const { error } = await supabase
    .from('quickstart_progress')
    .upsert(payload, { onConflict: 'team_id' })

  if (error) {
    console.error('quickstart progress error:', error.message)
  }
}

async function logAudit(supabase: TeamContext['supabase'], teamId: string, action: string) {
  await supabase.from('audit_logs').insert({
    team_id: teamId,
    action,
    created_at: new Date().toISOString(),
  })
}

export async function seedPositionGroups() {
  const { supabase, teamId } = await requireTeamContext()

  const payload = POSITIONAL_GROUP_DEFAULTS.map((group, index) => ({
    team_id: teamId,
    group_name: group.group,
    units: group.units,
    sort_order: index,
  }))

  const { error } = await supabase
    .from('team_position_groups')
    .upsert(payload, { onConflict: 'team_id,group_name' })

  if (error) {
    console.error('seedPositionGroups error:', error.message)
    return { success: false, error: 'position_groups' }
  }

  await markProgress(supabase, teamId, { seeded_position_groups: true })
  await logAudit(supabase, teamId, 'quickstart_seed_position_groups')
  return { success: true }
}

export async function seedChartTags() {
  const { supabase, teamId } = await requireTeamContext()

  const tags: Array<{ label: string; category: string }> = [
    { label: 'Trips', category: 'FORMATION' },
    { label: 'Bunch', category: 'FORMATION' },
    { label: 'Empty', category: 'FORMATION' },
    { label: '11 personnel', category: 'PERSONNEL' },
    { label: '12 personnel', category: 'PERSONNEL' },
    { label: 'Cover 3', category: 'COVERAGE' },
    { label: 'Cover 4', category: 'COVERAGE' },
    { label: 'Over', category: 'FRONT' },
    { label: 'Under', category: 'FRONT' },
    { label: 'Fire Zone', category: 'PRESSURE' },
    { label: '3rd & Medium', category: 'SITUATION' },
  ]

  const payload = tags.map((tag, index) => ({
    team_id: teamId,
    label: tag.label,
    category: tag.category,
    sort_order: index,
  }))

  const { error } = await supabase
    .from('chart_tags')
    .upsert(payload, { onConflict: 'team_id,category,label' })

  if (error) {
    console.error('seedChartTags error:', error.message)
    return { success: false, error: 'chart_tags' }
  }

  await markProgress(supabase, teamId, { seeded_tags: true })
  await logAudit(supabase, teamId, 'quickstart_seed_chart_tags')
  return { success: true }
}

export async function seedSchedule() {
  const { supabase, teamId } = await requireTeamContext()

  const nowIso = new Date().toISOString()
  const { data: existing } = await supabase
    .from('games')
    .select('id')
    .eq('team_id', teamId)
    .gte('start_time', nowIso)
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: true }
  }

  const kickoff = new Date()
  kickoff.setDate(kickoff.getDate() + 7)
  kickoff.setHours(19, 0, 0, 0)

  const { error } = await supabase.from('games').insert({
    team_id: teamId,
    opponent_name: 'TBD Opponent',
    start_time: kickoff.toISOString(),
    home_or_away: 'home',
    location: 'Home Stadium',
    season_label: `${kickoff.getFullYear()} Season`,
  })

  if (error) {
    console.error('seedSchedule error:', error.message)
    return { success: false, error: 'schedule' }
  }

  await markProgress(supabase, teamId, { seeded_schedule: true })
  await logAudit(supabase, teamId, 'quickstart_seed_schedule')
  return { success: true }
}

export async function finishQuickstart() {
  const { supabase, teamId } = await requireTeamContext()
  await markProgress(supabase, teamId, {
    seeded_position_groups: true,
    seeded_tags: true,
    seeded_schedule: true,
    completed_at: new Date().toISOString(),
  })
  await logAudit(supabase, teamId, 'quickstart_completed')
  redirect('/dashboard')
}
