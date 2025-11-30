import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export type AuthContext = {
  user: {
    id: string
    email?: string
  }
  activeTeamId: string | null
}

export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('active_team_id, email')
    .eq('id', user.id)
    .maybeSingle()

  return {
    user: { id: user.id, email: user.email ?? profile?.email ?? undefined },
    activeTeamId: (profile?.active_team_id as string | null) ?? null,
  }
}
