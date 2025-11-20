'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/utils/supabase/server'

function normalizeEmail(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get('token') || '').trim()
  if (!token) {
    redirect('/login?error=missing_token')
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirectTo=/invite/${token}`)
  }

  const serviceClient = createSupabaseServiceRoleClient()

  const { data: invite, error } = await serviceClient
    .from('team_invites')
    .select('id, team_id, email, role, status, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (error || !invite) {
    redirect(`/invite/${token}?error=invalid`)
  }

  const now = Date.now()
  const expiresAt = invite.expires_at ? new Date(invite.expires_at).getTime() : 0
  const expired = expiresAt > 0 && expiresAt < now
  const pending = invite.status === 'pending'
  const emailMatches =
    normalizeEmail(invite.email) !== '' &&
    normalizeEmail(invite.email) === normalizeEmail(user.email || '')

  if (expired) {
    redirect(`/invite/${token}?error=expired`)
  }

  if (!pending) {
    redirect(`/invite/${token}?error=used`)
  }

  if (!emailMatches) {
    redirect(`/invite/${token}?error=email_mismatch`)
  }

  const membershipResult = await serviceClient
    .from('team_members')
    .upsert(
      {
        team_id: invite.team_id,
        user_id: user.id,
        role: invite.role,
      },
      { onConflict: 'team_id,user_id' }
    )

  if (membershipResult.error) {
    console.error('acceptInvite membership error:', membershipResult.error.message)
    redirect(`/invite/${token}?error=membership_failed`)
  }

  const { error: profileUpdateError } = await serviceClient
    .from('users')
    .update({ active_team_id: invite.team_id })
    .eq('id', user.id)

  if (profileUpdateError) {
    console.error('acceptInvite active team update error:', profileUpdateError.message)
  }

  const updateResult = await serviceClient
    .from('team_invites')
    .update({ status: 'accepted' })
    .eq('id', invite.id)
    .eq('status', 'pending')

  if (updateResult.error) {
    console.error('acceptInvite update invite error:', updateResult.error.message)
    redirect(`/invite/${token}?error=invite_update_failed`)
  }

  const { data: quickstart } = await supabase
    .from('quickstart_progress')
    .select('completed_at')
    .eq('team_id', invite.team_id)
    .maybeSingle()

  if (quickstart?.completed_at) {
    redirect('/dashboard')
  }

  redirect('/onboarding/quickstart')
}
