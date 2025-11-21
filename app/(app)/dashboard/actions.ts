'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/utils/supabase/server'

const setActiveTeamSchema = z.object({
  teamId: z.string().uuid(),
})

export async function setActiveTeam(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?error=unauthorized')
  }

  const parsed = setActiveTeamSchema.safeParse({
    teamId: formData.get('teamId')?.toString(),
  })

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', parsed.data.teamId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError) {
    console.error('setActiveTeam membership check error:', membershipError.message)
    return { success: false, error: 'server_error' }
  }

  if (!membership) {
    return { success: false, error: 'not_member' }
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ active_team_id: parsed.data.teamId })
    .eq('id', user.id)

  if (updateError) {
    console.error('setActiveTeam update error:', updateError.message)
    return { success: false, error: 'server_error' }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

const setActiveTeamAndGoSchema = z.object({
  teamId: z.string().uuid(),
  redirectTo: z.string().default('/onboarding/quickstart'),
})

export async function setActiveTeamAndGo(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?error=unauthorized')
  }

  const parsed = setActiveTeamAndGoSchema.safeParse({
    teamId: formData.get('teamId')?.toString(),
    redirectTo: formData.get('redirectTo')?.toString() ?? '/onboarding/quickstart',
  })

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  const { teamId, redirectTo } = parsed.data

  const { data: membership, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError) {
    console.error('setActiveTeamAndGo membership check error:', membershipError.message)
    return { success: false, error: 'server_error' }
  }

  if (!membership) {
    return { success: false, error: 'not_member' }
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ active_team_id: teamId })
    .eq('id', user.id)

  if (updateError) {
    console.error('setActiveTeamAndGo update error:', updateError.message)
    return { success: false, error: 'server_error' }
  }

  revalidatePath('/dashboard')
  redirect(redirectTo)
}
