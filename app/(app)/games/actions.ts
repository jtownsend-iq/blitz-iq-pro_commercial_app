'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/utils/supabase/server'

const createGameSchema = z.object({
  opponent_name: z.string().min(1, 'Opponent is required').max(200),
  start_time: z.string().min(1, 'Start time is required'),
  home_or_away: z.string().max(20).optional(),
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
    home_or_away: formData.get('home_or_away'),
    location: formData.get('location'),
    season_label: formData.get('season_label'),
  })

  if (!parsed.success) {
    redirect('/games?error=invalid_game')
  }

  const gameData = parsed.data
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
    home_or_away: gameData.home_or_away || null,
    location: gameData.location || null,
    season_label: gameData.season_label || null,
    status: 'scheduled',
  })

  if (insertError) {
    console.error('createGame insert error:', insertError.message)
    const reason = encodeURIComponent(insertError.message ?? 'unknown')
    redirect(`/games?error=create_failed&reason=${reason}`)
  }

  revalidatePath('/games')
  redirect('/games')
}
