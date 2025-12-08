import { redirect } from 'next/navigation'
import { requireAuth } from '@/utils/auth/requireAuth'

export default async function PlayersRedirectPage() {
  const { activeTeamId } = await requireAuth()
  if (activeTeamId) {
    redirect(`/teams/${activeTeamId}`)
  }
  redirect('/teams')
}
