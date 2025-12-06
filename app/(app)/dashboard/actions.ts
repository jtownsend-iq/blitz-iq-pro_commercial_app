'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { sendServerTelemetry } from '@/utils/telemetry.server'
import { guardTenantAction } from '@/utils/tenant/limits'
import { requireTenantContext } from '@/utils/tenant/context'

const setActiveTeamSchema = z.object({
  teamId: z.string().uuid(),
})

export async function setActiveTeam(formData: FormData) {
  const { userId, teamId: currentTeamId } = await requireTenantContext({ auditEvent: 'dashboard_set_active_team' })
  const supabase = await createSupabaseServerClient()

  const parsed = setActiveTeamSchema.safeParse({
    teamId: formData.get('teamId')?.toString(),
  })

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  await guardTenantAction({ supabase, userId, teamId: currentTeamId, membershipRole: null, teamTier: null }, 'default')

  const { data: membership, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', parsed.data.teamId)
    .eq('user_id', userId)
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
    .eq('id', userId)

  if (updateError) {
    console.error('setActiveTeam update error:', updateError.message)
    await sendServerTelemetry('dashboard_set_active_team_error', {
      reason: updateError.message,
      targetTeam: parsed.data.teamId,
    })
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
  const { userId, teamId: currentTeamId } = await requireTenantContext({ auditEvent: 'dashboard_set_active_team_go' })
  const supabase = await createSupabaseServerClient()

  const parsed = setActiveTeamAndGoSchema.safeParse({
    teamId: formData.get('teamId')?.toString(),
    redirectTo: formData.get('redirectTo')?.toString() ?? '/onboarding/quickstart',
  })

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  const { teamId, redirectTo } = parsed.data

  await guardTenantAction({ supabase, userId, teamId: currentTeamId, membershipRole: null, teamTier: null }, 'default')

  const { data: membership, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
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
    .eq('id', userId)

  if (updateError) {
    console.error('setActiveTeamAndGo update error:', updateError.message)
    await sendServerTelemetry('dashboard_set_active_team_error', {
      reason: updateError.message,
      targetTeam: teamId,
    })
    return { success: false, error: 'server_error' }
  }

  revalidatePath('/dashboard')
  redirect(redirectTo)
}
