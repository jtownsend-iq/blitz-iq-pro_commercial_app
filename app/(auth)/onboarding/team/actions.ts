// app/onboarding/team/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { z } from 'zod'

const teamSchema = z.object({
  name: z.string().min(2, 'Team name is required').max(200),
  level: z.string().max(100).optional(),
  school_name: z.string().max(200).optional(),
  school_address_line1: z.string().max(200).optional(),
  school_city: z.string().max(100).optional(),
  school_state: z.string().max(50).optional(),
  school_zip: z.string().max(20).optional(),
})

// Helper: safe redirect param (only allow internal paths)
function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path) return '/dashboard'
  try {
    // Disallow absolute URLs
    const url = new URL(path, 'http://localhost')
    const value = url.pathname + (url.search || '')
    return value.startsWith('/') ? value : '/dashboard'
  } catch {
    return '/dashboard'
  }
}

export async function createInitialTeam(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?error=unauthorized')
  }

  // Pull and normalize form fields
  const raw = {
    name: (formData.get('name') ?? '').toString().trim(),
    level: (formData.get('level') ?? '').toString().trim() || undefined,
    school_name: (formData.get('school_name') ?? '').toString().trim() || undefined,
    school_address_line1:
      (formData.get('school_address_line1') ?? '').toString().trim() || undefined,
    school_city: (formData.get('school_city') ?? '').toString().trim() || undefined,
    school_state: (formData.get('school_state') ?? '').toString().trim() || undefined,
    school_zip: (formData.get('school_zip') ?? '').toString().trim() || undefined,
  }

  const redirectTo = sanitizeRedirectPath(
    (formData.get('redirectTo') ?? '/dashboard').toString()
  )

  const parsed = teamSchema.safeParse(raw)

  if (!parsed.success) {
    // For now we just bounce back with a generic error. Later you can surface field-level errors.
    redirect('/onboarding/team?error=invalid')
  }

  const teamData = parsed.data
  const userId = user.id
  const userEmail = user.email ?? ''

  // 1) Ensure profile row exists in public.users
  const { data: existingProfile } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (!existingProfile) {
    const { error: profileInsertError } = await supabase.from('users').insert({
      id: userId,
      email: userEmail,
    })

    if (profileInsertError) {
      // Hard fail — we can’t safely proceed without a profile row
      redirect('/onboarding/team?error=user')
    }
  }

  // 2) Short-circuit if they already have a team (protect against double-submit)
  const { data: existingMemberships, error: tmError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .limit(1)

  if (!tmError && existingMemberships && existingMemberships.length > 0) {
    redirect('/dashboard')
  }

  // 3) Create the team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      name: teamData.name,
      level: teamData.level ?? null,
      school_name: teamData.school_name ?? null,
      school_address_line1: teamData.school_address_line1 ?? null,
      school_city: teamData.school_city ?? null,
      school_state: teamData.school_state ?? null,
      school_zip: teamData.school_zip ?? null,
      // primary_color / logo_url can be set later from Settings
    })
    .select('id')
    .single()

  if (teamError || !team) {
    redirect('/onboarding/team?error=team')
  }

  const teamId = team.id
  const currentYear = new Date().getFullYear()

  // 4) Seed team_settings (non-critical if this fails, but we try)
  await supabase.from('team_settings').insert({
    team_id: teamId,
    timezone: 'America/Chicago',
    default_season_year: currentYear,
    analytics_level: 'STANDARD',
  })

  // 5) Seed a default season
  await supabase.from('seasons').insert({
    team_id: teamId,
    year: currentYear,
    label: `${currentYear} Season`,
  })

  // 6) Create membership: user → team
  const { error: memberError } = await supabase.from('team_members').insert({
    team_id: teamId,
    user_id: userId,
    role: 'OWNER', // fits your schema; you can enforce a role enum later
  })

  if (memberError) {
    redirect('/onboarding/team?error=member')
  }

  // 7) Set active_team_id on users
  const { error: userUpdateError } = await supabase
    .from('users')
    .update({ active_team_id: teamId })
    .eq('id', userId)

  if (userUpdateError) {
    redirect('/onboarding/team?error=user')
  }

  // Initial onboarding complete → go where they were trying to go, or /dashboard
  redirect(redirectTo || '/dashboard')
}
