// app/onboarding/team/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function createInitialTeam(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const teamName = String(formData.get('teamName') || '').trim()
  const schoolName = String(formData.get('schoolName') || '').trim()
  const level = String(formData.get('level') || '').trim()
  const schoolAddress = String(formData.get('schoolAddress') || '').trim()
  const schoolCity = String(formData.get('schoolCity') || '').trim()
  const schoolState = String(formData.get('schoolState') || '').trim()
  const schoolZip = String(formData.get('schoolZip') || '').trim()

  if (!teamName) {
    redirect('/onboarding/team?error=missing_team')
  }

  // 1) Create team row
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      name: teamName,
      school_name: schoolName || null,
      level: level || null,
      school_address_line1: schoolAddress || null,
      school_city: schoolCity || null,
      school_state: schoolState || null,
      school_zip: schoolZip || null,
    })
    .select('id')
    .single()

  if (teamError || !team) {
    console.error('Error creating team:', teamError?.message)
    redirect('/onboarding/team?error=team')
  }

  const teamId = team.id as string

  // 2) Attach current user as team owner
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    console.error('Error creating team membership:', memberError.message)
    redirect('/onboarding/team?error=member')
  }

  // 3) Set this as active_team_id on users
  const { error: userUpdateError } = await supabase
    .from('users')
    .update({ active_team_id: teamId })
    .eq('id', user.id)

  if (userUpdateError) {
    console.error(
      'Error updating active_team_id:',
      userUpdateError.message
    )
    // Not fatal; they still have a team & membership.
  }

  redirect('/dashboard')
}