'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/utils/supabase/server'

const createGameSchema = z.object({
  opponent_name: z.string().min(1, 'Opponent is required').max(200),
  start_time: z.string().min(1, 'Start time is required'),
  home_away: z.enum(['HOME', 'AWAY']),
  location: z.string().max(200).optional(),
  season_label: z.string().max(150).optional(),
})

export async function createGame(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const serviceClient = createSupabaseServiceRoleClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?error=unauthorized')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('active_team_id')
    .eq('id', user.id)
    .maybeSingle()

  const activeTeamId = (profile?.active_team_id as string | null) ?? null
  if (!activeTeamId) {
    redirect('/onboarding/team')
  }

  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', activeTeamId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    redirect('/dashboard')
  }

  const parsed = createGameSchema.safeParse({
    opponent_name: formData.get('opponent_name'),
    start_time: formData.get('start_time'),
    home_away: formData.get('home_away'),
    location: formData.get('location'),
    season_label: formData.get('season_label'),
  })

  if (!parsed.success) {
    redirect('/games?error=invalid_game')
  }

  const gameData = parsed.data
  const normalizedHomeAway = gameData.home_away.toUpperCase() as 'HOME' | 'AWAY'
  const startTimeDate = new Date(gameData.start_time)
  if (Number.isNaN(startTimeDate.getTime())) {
    redirect('/games?error=invalid_game')
  }
  const startDateIso = startTimeDate.toISOString().slice(0, 10) // YYYY-MM-DD for date column

  const { error: insertError } = await serviceClient.from('games').insert({
    team_id: activeTeamId,
    opponent_name: gameData.opponent_name,
    start_time: startTimeDate.toISOString(),
    date: startDateIso,
    home_away: normalizedHomeAway,
    home_or_away: normalizedHomeAway, // keep both columns in sync
    location: gameData.location || null,
    season_label: gameData.season_label || null,
    status: 'scheduled',
  })

  if (insertError) {
    console.error('createGame insert error:', insertError.message)
    const isHomeAwayConstraint =
      insertError.code === '23514' && insertError.message.toLowerCase().includes('home_away')
    const reason = isHomeAwayConstraint
      ? 'Select Home or Away to create the game.'
      : insertError.message ?? 'unknown'
    redirect(`/games?error=create_failed&reason=${encodeURIComponent(reason)}`)
  }

  revalidatePath('/games')
  redirect('/games')
}
