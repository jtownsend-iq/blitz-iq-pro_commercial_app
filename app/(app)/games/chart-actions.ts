'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { generateDriveSummary } from '@/utils/ai/generateDriveSummary'

const chartUnitSchema = z.enum(['OFFENSE', 'DEFENSE', 'SPECIAL_TEAMS'])

const startSessionSchema = z.object({
  gameId: z.string().uuid(),
  unit: chartUnitSchema,
})

const closeSessionSchema = z.object({
  sessionId: z.string().uuid(),
})

const clockRegex = /^([0-5]?[0-9]):([0-5][0-9])$/

const chartEventSchema = z.object({
  sessionId: z.string().uuid(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
  clock: z
    .string()
    .regex(clockRegex, 'Clock must be MM:SS')
    .optional(),
  ballOn: z.string().max(10).optional(),
  hashMark: z.string().max(10).optional(),
  down: z.coerce.number().int().min(1).max(4).optional(),
  distance: z.coerce.number().int().min(1).max(50).optional(),
  driveNumber: z.coerce.number().int().min(1).optional(),
  possession: z.string().max(16).optional(),
  opponent: z.string().max(120).optional(),
  // Offensive structure (codes + raw)
  offensive_personnel_code: z.string().max(10).optional(),
  offensivePersonnel: z.string().max(60).optional(),
  offensive_formation_code: z.string().max(120).optional(),
  formation: z.string().max(120).optional(),
  backfield_code: z.string().max(120).optional(),
  backs_count: z.coerce.number().int().min(0).max(4).optional(),
  backfield_family: z.string().max(120).optional(),
  backfield_variant: z.string().max(120).optional(),
  qb_alignment: z.string().max(60).optional(),
  hback_role: z.string().max(60).optional(),
  has_shift: z.coerce.boolean().optional(),
  has_motion: z.coerce.boolean().optional(),
  motion_type: z.string().max(60).optional(),
  // WR concepts / routes
  wr_concept_code: z.string().max(120).optional(),
  wr_concept_family: z.string().max(120).optional(),
  qb_drop: z.string().max(60).optional(),
  primary_coverage_beater: z.string().max(120).optional(),
  route_tag_x: z.string().max(120).optional(),
  route_tag_z: z.string().max(120).optional(),
  route_tag_y: z.string().max(120).optional(),
  route_tag_h: z.string().max(120).optional(),
  route_tag_rb: z.string().max(120).optional(),
  // Offensive flags
  is_rpo: z.coerce.boolean().optional(),
  is_play_action: z.coerce.boolean().optional(),
  is_shot_play: z.coerce.boolean().optional(),
  // Defensive (raw + codes)
  defensivePersonnel: z.string().max(60).optional(),
  defensive_personnel_code: z.string().max(120).optional(),
  front: z.string().max(120).optional(),
  front_code: z.string().max(120).optional(),
  coverage: z.string().max(120).optional(),
  coverage_code: z.string().max(120).optional(),
  pressure: z.string().max(120).optional(),
  pressure_code: z.string().max(120).optional(),
  // Results
  playCall: z.string().max(160).optional(),
  result: z.string().max(160).optional(),
  play_result_type: z.string().max(60).optional(),
  gainedYards: z.coerce.number().int().min(-99).max(99).optional(),
  explosive: z.coerce.boolean().optional(),
  turnover: z.coerce.boolean().optional(),
  first_down: z.coerce.boolean().optional(),
  scoring_play: z.coerce.boolean().optional(),
  penalty_yards: z.coerce.number().int().min(-99).max(99).optional(),
  penalty_on_offense: z.coerce.boolean().optional(),
  notes: z.string().max(1000).optional(),
  supersedesId: z.string().uuid().optional(),
  tags: z.array(z.string().uuid()).optional(),
})

type SessionContext = {
  teamId: string
  gameId: string
  unit: string
}

async function getAuthContext(): Promise<{
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
  userId: string
  teamId: string
}> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?error=unauthorized')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('active_team_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error fetching user profile for chart actions:', profileError.message)
  }

  const activeTeamId = profile?.active_team_id as string | null

  if (!activeTeamId) {
    redirect('/onboarding/team')
  }

  return { supabase, userId: user.id, teamId: activeTeamId }
}

function parseClockToSeconds(value?: string): number | null {
  if (!value) return null
  const match = value.match(clockRegex)
  if (!match) return null
  const minutes = Number(match[1])
  const seconds = Number(match[2])
  return minutes * 60 + seconds
}

function parseBallSpot(raw?: string): {
  ball_on_side: 'OWN' | 'OPP' | null
  ball_on_yardline: number | null
} {
  if (!raw) return { ball_on_side: null, ball_on_yardline: null }
  const upper = raw.toUpperCase().trim()
  const match = upper.match(/^(O|O(WN)?|H|H(OME)?|OWN|OPP|V|V(IS)?|GUEST)?\s*([0-9]{1,2})$/)
  if (match) {
    const prefix = match[1] || ''
    const yard = Number(match[3])
    const side =
      prefix.startsWith('O') || prefix.startsWith('H') || prefix === ''
        ? 'OWN'
        : 'OPP'
    return { ball_on_side: side, ball_on_yardline: Number.isNaN(yard) ? null : yard }
  }
  return { ball_on_side: null, ball_on_yardline: null }
}

export async function startGameSession(formData: FormData) {
  const parsed = startSessionSchema.safeParse({
    gameId: formData.get('gameId')?.toString(),
    unit: formData.get('unit')?.toString(),
  })

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  const { supabase, userId, teamId } = await getAuthContext()
  const { gameId, unit } = parsed.data

  const { data: gameRow, error: gameError } = await supabase
    .from('games')
    .select('id, team_id')
    .eq('id', gameId)
    .maybeSingle()

  if (gameError) {
    console.error('startGameSession fetch game error:', gameError.message)
    return { success: false, error: 'server_error' }
  }

  if (!gameRow || (gameRow.team_id as string) !== teamId) {
    return { success: false, error: 'not_allowed' }
  }

  const { data: existingSession, error: existingError } = await supabase
    .from('game_sessions')
    .select('id, status')
    .eq('game_id', gameId)
    .eq('unit', unit)
    .in('status', ['pending', 'active'])
    .maybeSingle()

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('startGameSession check existing error:', existingError.message)
    return { success: false, error: 'server_error' }
  }

  if (existingSession) {
    return { success: false, error: 'session_exists', sessionId: existingSession.id }
  }

  const { data: session, error: insertError } = await supabase
    .from('game_sessions')
    .insert({
      team_id: teamId,
      game_id: gameId,
      unit,
      status: 'active',
      analyst_user_id: userId,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !session) {
    console.error('startGameSession insert error:', insertError?.message)
    return { success: false, error: 'server_error' }
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true, sessionId: session.id }
}

export async function closeGameSession(formData: FormData) {
  const parsed = closeSessionSchema.safeParse({
    sessionId: formData.get('sessionId')?.toString(),
  })

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  const { supabase, teamId } = await getAuthContext()

  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select('id, team_id, game_id, unit')
    .eq('id', parsed.data.sessionId)
    .maybeSingle()

  if (sessionError || !session) {
    console.error('closeGameSession fetch error:', sessionError?.message)
    return { success: false, error: 'not_found' }
  }

  if ((session.team_id as string) !== teamId) {
    return { success: false, error: 'not_allowed' }
  }

  const { error: updateError } = await supabase
    .from('game_sessions')
    .update({
      status: 'closed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.sessionId)

  if (updateError) {
    console.error('closeGameSession update error:', updateError.message)
    return { success: false, error: 'server_error' }
  }

  revalidatePath(`/games/${session.game_id}`)
  return { success: true }
}

export async function recordChartEvent(formData: FormData) {
  const parsed = chartEventSchema.safeParse({
    sessionId: formData.get('sessionId')?.toString(),
    quarter: formData.get('quarter'),
    clock: formData.get('clock')?.toString(),
    ballOn: formData.get('ballOn')?.toString(),
    hashMark: formData.get('hashMark')?.toString(),
    down: formData.get('down'),
    distance: formData.get('distance'),
    driveNumber: formData.get('driveNumber'),
    possession: formData.get('possession')?.toString(),
    opponent: formData.get('opponent')?.toString(),
    offensive_personnel_code: formData.get('offensive_personnel_code')?.toString(),
    offensivePersonnel: formData.get('offensivePersonnel')?.toString(),
    offensive_formation_code: formData.get('offensive_formation_code')?.toString(),
    formation: formData.get('formation')?.toString(),
    backfield_code: formData.get('backfield_code')?.toString(),
    backs_count: formData.get('backs_count'),
    backfield_family: formData.get('backfield_family')?.toString(),
    backfield_variant: formData.get('backfield_variant')?.toString(),
    qb_alignment: formData.get('qb_alignment')?.toString(),
    hback_role: formData.get('hback_role')?.toString(),
    has_shift: formData.get('has_shift'),
    has_motion: formData.get('has_motion'),
    motion_type: formData.get('motion_type')?.toString(),
    wr_concept_code: formData.get('wr_concept_code')?.toString(),
    wr_concept_family: formData.get('wr_concept_family')?.toString(),
    qb_drop: formData.get('qb_drop')?.toString(),
    primary_coverage_beater: formData.get('primary_coverage_beater')?.toString(),
    route_tag_x: formData.get('route_tag_x')?.toString(),
    route_tag_z: formData.get('route_tag_z')?.toString(),
    route_tag_y: formData.get('route_tag_y')?.toString(),
    route_tag_h: formData.get('route_tag_h')?.toString(),
    route_tag_rb: formData.get('route_tag_rb')?.toString(),
    is_rpo: formData.get('is_rpo'),
    is_play_action: formData.get('is_play_action'),
    is_shot_play: formData.get('is_shot_play'),
    defensivePersonnel: formData.get('defensivePersonnel')?.toString(),
    defensive_personnel_code: formData.get('defensive_personnel_code')?.toString(),
    front: formData.get('front')?.toString(),
    front_code: formData.get('front_code')?.toString(),
    coverage: formData.get('coverage')?.toString(),
    coverage_code: formData.get('coverage_code')?.toString(),
    pressure: formData.get('pressure')?.toString(),
    pressure_code: formData.get('pressure_code')?.toString(),
    playCall: formData.get('playCall')?.toString(),
    result: formData.get('result')?.toString(),
    play_result_type: formData.get('play_result_type')?.toString(),
    gainedYards: formData.get('gainedYards'),
    explosive: formData.get('explosive'),
    turnover: formData.get('turnover'),
    first_down: formData.get('first_down'),
    scoring_play: formData.get('scoring_play'),
    penalty_yards: formData.get('penalty_yards'),
    penalty_on_offense: formData.get('penalty_on_offense'),
    notes: formData.get('notes')?.toString(),
    supersedesId: formData.get('supersedesId')?.toString(),
    tags: formData.getAll('tags').map((value) => value.toString()),
  })

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  const { supabase, userId, teamId } = await getAuthContext()

  const { data: sessionRow, error: sessionError } = await supabase
    .from('game_sessions')
    .select('id, team_id, game_id, unit, status')
    .eq('id', parsed.data.sessionId)
    .maybeSingle()

  if (sessionError || !sessionRow) {
    console.error('recordChartEvent session error:', sessionError?.message)
    return { success: false, error: 'not_found' }
  }

  if ((sessionRow.team_id as string) !== teamId) {
    return { success: false, error: 'not_allowed' }
  }

  if (sessionRow.status !== 'active') {
    return { success: false, error: 'session_closed' }
  }

  const { data: lastSeqData, error: seqError } = await supabase
    .from('chart_events')
    .select('sequence')
    .eq('game_session_id', sessionRow.id)
    .order('sequence', { ascending: false })
    .limit(1)

  if (seqError) {
    console.error('recordChartEvent seq fetch error:', seqError.message)
    return { success: false, error: 'server_error' }
  }

  const nextSequence = (lastSeqData?.[0]?.sequence ?? 0) + 1
  const clockSeconds = parseClockToSeconds(parsed.data.clock ?? undefined)
  const ballSpot = parseBallSpot(parsed.data.ballOn ?? undefined)

  const payload = {
    team_id: sessionRow.team_id,
    game_id: sessionRow.game_id,
    game_session_id: sessionRow.id,
    sequence: nextSequence,
    quarter: parsed.data.quarter ?? null,
    clock_seconds: clockSeconds,
    ball_on: parsed.data.ballOn ?? null,
    hash_mark: parsed.data.hashMark ?? null,
    down: parsed.data.down ?? null,
    distance: parsed.data.distance ?? null,
    drive_number: parsed.data.driveNumber ?? null,
    possession: parsed.data.possession ?? null,
    opponent: parsed.data.opponent ?? null,
    ball_on_side: ballSpot.ball_on_side,
    ball_on_yardline: ballSpot.ball_on_yardline,
    ball_on_raw: parsed.data.ballOn ?? null,
    offensive_personnel: parsed.data.offensivePersonnel ?? null,
    offensive_personnel_code: parsed.data.offensive_personnel_code ?? null,
    offensive_formation: parsed.data.formation ?? null,
    offensive_formation_code: parsed.data.offensive_formation_code ?? null,
    backfield_code: parsed.data.backfield_code ?? null,
    backs_count: parsed.data.backs_count ? Number(parsed.data.backs_count) : null,
    backfield_family: parsed.data.backfield_family ?? null,
    backfield_variant: parsed.data.backfield_variant ?? null,
    qb_alignment: parsed.data.qb_alignment ?? null,
    hback_role: parsed.data.hback_role ?? null,
    has_shift: parsed.data.has_shift ?? false,
    has_motion: parsed.data.has_motion ?? false,
    motion_type: parsed.data.motion_type ?? null,
    wr_concept_code: parsed.data.wr_concept_code ?? null,
    wr_concept_family: parsed.data.wr_concept_family ?? null,
    qb_drop: parsed.data.qb_drop ?? null,
    primary_coverage_beater: parsed.data.primary_coverage_beater ?? null,
    route_tag_x: parsed.data.route_tag_x ?? null,
    route_tag_z: parsed.data.route_tag_z ?? null,
    route_tag_y: parsed.data.route_tag_y ?? null,
    route_tag_h: parsed.data.route_tag_h ?? null,
    route_tag_rb: parsed.data.route_tag_rb ?? null,
    is_rpo: parsed.data.is_rpo ?? false,
    is_play_action: parsed.data.is_play_action ?? false,
    is_shot_play: parsed.data.is_shot_play ?? false,
    defensive_personnel: parsed.data.defensivePersonnel ?? null,
    defensive_personnel_code: parsed.data.defensive_personnel_code ?? null,
    front: parsed.data.front ?? null,
    front_code: parsed.data.front_code ?? null,
    coverage: parsed.data.coverage ?? null,
    coverage_code: parsed.data.coverage_code ?? null,
    pressure: parsed.data.pressure ?? null,
    pressure_code: parsed.data.pressure_code ?? null,
    play_call: parsed.data.playCall ?? null,
    result: parsed.data.result ?? null,
    play_result_type: parsed.data.play_result_type ?? null,
    gained_yards: parsed.data.gainedYards ?? null,
    explosive: parsed.data.explosive ?? false,
    turnover: parsed.data.turnover ?? false,
    first_down: parsed.data.first_down ?? null,
    scoring_play: parsed.data.scoring_play ?? null,
    penalty_yards: parsed.data.penalty_yards ? Number(parsed.data.penalty_yards) : null,
    penalty_on_offense: parsed.data.penalty_on_offense ?? null,
    notes: parsed.data.notes ?? null,
    supersedes_event_id: parsed.data.supersedesId ?? null,
    created_by: userId,
  }

  const { data: insertedEvent, error: insertError } = await supabase
    .from('chart_events')
    .insert(payload)
    .select('id')
    .single()

  if (insertError || !insertedEvent) {
    console.error('recordChartEvent insert error:', insertError?.message)
    return { success: false, error: 'server_error' }
  }

  if (parsed.data.tags && parsed.data.tags.length > 0) {
    const eventTagsPayload = parsed.data.tags.map((tagId) => ({
      chart_event_id: insertedEvent.id,
      tag_id: tagId,
    }))

    const { error: tagError } = await supabase.from('chart_event_tags').insert(eventTagsPayload)

    if (tagError) {
      console.error('recordChartEvent tags error:', tagError.message)
    }
  }

  await upsertDriveSnapshot(
    supabase,
    {
      team_id: sessionRow.team_id as string,
      game_id: sessionRow.game_id as string,
      game_session_id: sessionRow.id as string,
      unit: sessionRow.unit as string,
    },
    parsed.data.driveNumber ?? null
  )

  revalidatePath(`/games/${sessionRow.game_id}`)
  return { success: true, eventId: insertedEvent.id }
}

export async function fetchSessionContext(
  sessionId: string
): Promise<SessionContext | null> {
  const { supabase } = await getAuthContext()

  const { data, error } = await supabase
    .from('game_sessions')
    .select('team_id, game_id, unit')
    .eq('id', sessionId)
    .maybeSingle()

  if (error) {
    console.error('fetchSessionContext error:', error.message)
    return null
  }

  if (!data) return null

  return {
    teamId: data.team_id as string,
    gameId: data.game_id as string,
    unit: data.unit as string,
  }
}

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

async function upsertDriveSnapshot(
  supabase: SupabaseClient,
  sessionContext: {
    team_id: string
    game_id: string
    game_session_id: string
    unit: string
  },
  driveNumber: number | null
) {
  if (!driveNumber) return

  const { data: driveEvents, error } = await supabase
    .from('chart_events')
    .select('gained_yards, explosive, turnover')
    .eq('team_id', sessionContext.team_id)
    .eq('game_session_id', sessionContext.game_session_id)
    .eq('drive_number', driveNumber)
    .order('sequence', { ascending: true })

  if (error) {
    console.error('upsertDriveSnapshot fetch error:', error.message)
    return
  }

  const plays = driveEvents?.length ?? 0
  const totalYards =
    driveEvents?.reduce((sum, event) => sum + (event.gained_yards ?? 0), 0) ?? 0
  const explosivePlays =
    driveEvents?.filter((event) => Boolean(event.explosive)).length ?? 0
  const turnovers =
    driveEvents?.filter((event) => Boolean(event.turnover)).length ?? 0

  const ai_summary =
    plays === 0
      ? 'Not enough plays to evaluate yet.'
      : await generateDriveSummary({
          unit: sessionContext.unit,
          plays,
          totalYards,
          explosivePlays,
          turnovers,
        })

  const metrics = {
    plays,
    totalYards,
    explosivePlays,
    turnovers,
    ai_summary,
  }

  const situation = {
    drive: driveNumber,
    unit: sessionContext.unit,
  }

  const basePayload = {
    team_id: sessionContext.team_id,
    game_id: sessionContext.game_id,
    game_session_id: sessionContext.game_session_id,
    drive_number: driveNumber,
    situation,
    metrics,
    generated_at: new Date().toISOString(),
  }

  const { data: existingSnapshot } = await supabase
    .from('chart_snapshots')
    .select('id')
    .eq('team_id', sessionContext.team_id)
    .eq('game_session_id', sessionContext.game_session_id)
    .eq('drive_number', driveNumber)
    .maybeSingle()

  if (existingSnapshot?.id) {
    await supabase.from('chart_snapshots').update(basePayload).eq('id', existingSnapshot.id)
  } else {
    await supabase.from('chart_snapshots').insert(basePayload)
  }
}
