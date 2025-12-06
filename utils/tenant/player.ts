import { createSupabaseServerClient } from '@/utils/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export async function fetchPlayerTeamId(supabase: SupabaseClient, playerId: string): Promise<string> {
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('team_id')
    .eq('id', playerId)
    .maybeSingle()

  if (playerError || !player?.team_id) {
    throw new Error('Player not found or team missing')
  }

  return player.team_id as string
}
