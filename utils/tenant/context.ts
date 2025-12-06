import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { sendServerTelemetry } from '@/utils/telemetry.server'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export type TenantContext = {
  supabase: SupabaseClient
  userId: string
  email?: string
  teamId: string
  membershipRole?: string | null
  teamTier?: string | null
}

type RequireTenantOptions = {
  redirectOnMissingTeam?: boolean
  auditEvent?: string
}

export async function requireTenantContext(options: RequireTenantOptions = {}): Promise<TenantContext> {
  const { redirectOnMissingTeam = true, auditEvent } = options
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?error=unauthorized')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('active_team_id, email')
    .eq('id', user.id)
    .maybeSingle()

  const activeTeamId = profile?.active_team_id as string | null

  if (!activeTeamId) {
    if (redirectOnMissingTeam) {
      redirect('/onboarding/team')
    }
    throw new Error('No active team set for user.')
  }

  const { data: membership, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('team_id', activeTeamId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError || !membership) {
    await sendServerTelemetry('tenant_membership_denied', {
      teamId: activeTeamId,
      userId: user.id,
      reason: membershipError?.message ?? 'missing_membership',
    })
    redirect('/login?error=forbidden')
  }

  let teamTier: string | null = null
  try {
    const { data: teamRow, error: teamError } = await supabase
      .from('teams')
      .select('billing_tier')
      .eq('id', activeTeamId)
      .maybeSingle()

    if (!teamError) {
      teamTier = (teamRow?.billing_tier as string | null) ?? null
    }
  } catch {
    // Ignore best-effort tier lookup
  }

  if (auditEvent) {
    await sendServerTelemetry(auditEvent, {
      teamId: activeTeamId,
      userId: user.id,
      role: membership.role,
      tier: teamTier ?? 'standard',
    })
  }

  return {
    supabase,
    userId: user.id,
    email: user.email ?? (profile?.email as string | undefined),
    teamId: activeTeamId,
    membershipRole: (membership.role as string | null) ?? null,
    teamTier,
  }
}

export function assertTeamScope(teamId: string, targetTeamId: string | null | undefined, action?: string) {
  if (!targetTeamId || teamId !== targetTeamId) {
    void sendServerTelemetry('tenant_scope_violation', { teamId, targetTeamId, action })
    throw new Error('Tenant scope violation')
  }
}

export function assertTenantRole(
  tenant: TenantContext,
  allowedRoles: readonly string[],
  action?: string,
  redirectPath: string | null = '/login?error=forbidden'
) {
  const role = (tenant.membershipRole || '').toLowerCase()
  const ok = allowedRoles.map((r) => r.toLowerCase()).includes(role)
  if (!ok) {
    void sendServerTelemetry('tenant_role_violation', {
      teamId: tenant.teamId,
      userId: tenant.userId,
      role,
      action,
    })
    if (redirectPath) redirect(redirectPath)
    throw new Error('Insufficient role for action')
  }
}
