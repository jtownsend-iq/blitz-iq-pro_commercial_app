'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/utils/supabase/clients'

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
  offensivePersonnel: z.string().max(60).optional(),
  defensivePersonnel: z.string().max(60).optional(),
  formation: z.string().max(120).optional(),
  front: z.string().max(120).optional(),
  coverage: z.string().max(120).optional(),
  pressure: z.string().max(120).optional(),
  playCall: z.string().max(160).optional(),
  result: z.string().max(160).optional(),
  gainedYards: z.coerce.number().int().min(-99).max(99).optional(),
  explosive: z.coerce.boolean().optional(),
  turnover: z.coerce.boolean().optional(),
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
    offensivePersonnel: formData.get('offensivePersonnel')?.toString(),
    defensivePersonnel: formData.get('defensivePersonnel')?.toString(),
    formation: formData.get('formation')?.toString(),
    front: formData.get('front')?.toString(),
    coverage: formData.get('coverage')?.toString(),
    pressure: formData.get('pressure')?.toString(),
    playCall: formData.get('playCall')?.toString(),
    result: formData.get('result')?.toString(),
    gainedYards: formData.get('gainedYards'),
    explosive: formData.get('explosive'),
    turnover: formData.get('turnover'),
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
    offensive_personnel: parsed.data.offensivePersonnel ?? null,
    defensive_personnel: parsed.data.defensivePersonnel ?? null,
    formation: parsed.data.formation ?? null,
    front: parsed.data.front ?? null,
    coverage: parsed.data.coverage ?? null,
    pressure: parsed.data.pressure ?? null,
    play_call: parsed.data.playCall ?? null,
    result: parsed.data.result ?? null,
    gained_yards: parsed.data.gainedYards ?? null,
    explosive: parsed.data.explosive ?? false,
    turnover: parsed.data.turnover ?? false,
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
