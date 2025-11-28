import { redirect } from 'next/navigation'
import { Users, Shield, UserPlus, ClipboardList, Crown, Mail, AlertTriangle, Sparkles, ActivitySquare, ArrowRight } from 'lucide-react'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import PlayerGrid from '@/components/players/PlayerGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { StatBadge } from '@/components/ui/StatBadge'
import { CTAButton } from '@/components/ui/CTAButton'
import { InputField } from '@/components/ui/InputField'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  addRosterPlayer,
  inviteStaffMember,
  updateStaffRole,
  removeStaffMember,
  cancelStaffInvite,
} from '@/app/(app)/settings/actions'
import { STAFF_ROLE_OPTIONS } from '@/app/(app)/settings/constants'
import { DEFAULT_TIMEZONE } from '@/utils/timezone'

type PlayerRow = {
  id: string
  first_name: string | null
  last_name: string | null
  jersey_number: string | null
  position: string | null
  unit: string | null
  class_year: number | null
  status: string | null
  status_reason: string | null
  return_target_date: string | null
  pitch_count: number | null
  packages: string[] | null
  scout_team: boolean | null
  tags: string[] | null
}

type StaffMemberRow = {
  user_id: string
  role: string | null
  users: {
    full_name: string | null
    email: string | null
  } | null
}

type StaffMemberRowRaw = Omit<StaffMemberRow, 'users'> & {
  users: StaffMemberRow['users'] | StaffMemberRow['users'][] | null
}

type TeamInviteRow = {
  id: string
  email: string | null
  role: string | null
  status: string | null
  created_at: string | null
  expires_at: string | null
}

type PositionGroupRow = {
  id: string
  group_name: string | null
  units: string[] | null
  sort_order: number | null
}

export default async function TeamPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('active_team_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error fetching profile:', profileError.message)
  }

  const activeTeamId = profile?.active_team_id as string | null
  if (!activeTeamId) {
    redirect('/onboarding/team')
  }

  const { data: membership, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('team_id', activeTeamId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError) {
    console.error('Error verifying membership:', membershipError.message)
  }

  if (!membership) {
    return (
      <section className="space-y-4">
        <GlassCard tone="amber">
          <p className="text-sm text-amber-100">You do not have access to this team. Please switch to a team you belong to.</p>
        </GlassCard>
      </section>
    )
  }

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('name, level, school_name')
    .eq('id', activeTeamId)
    .maybeSingle()

  if (teamError) {
    console.error('Error fetching team:', teamError.message)
  }

  const {
    players,
    staff,
    invites,
    positionGroups,
  } = await fetchTeamData(supabase, activeTeamId)

  const readiness = buildReadiness(players, staff)
  const nextReturn = buildNextReturn(players)

  const safePlayers: PlayerRow[] =
    Array.isArray(players) && players.every((p) => p && typeof p === 'object' && 'id' in p)
      ? (players as PlayerRow[])
      : []

  return (
    <section className="space-y-8">
      <SectionHeader
        eyebrow="Team Command"
        title="Roster, staff, and readiness"
        description={`${team?.name || 'Your team'} | ${
          team?.school_name || 'School'
        }${team?.level ? ` | ${team.level}` : ''}`}
        badge="Command Center"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CTAButton href="#add-player" variant="primary" size="sm" iconLeft={<UserPlus className="h-4 w-4" />}>
              Add player
            </CTAButton>
            <CTAButton href="#staff" variant="secondary" size="sm" iconLeft={<Users className="h-4 w-4" />}>
              Invite staff
            </CTAButton>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-200">
        {[
          { label: 'Readiness', href: '#readiness' },
          { label: 'Roster', href: '#roster' },
          { label: 'Add player', href: '#add-player' },
          { label: 'Staff', href: '#staff' },
          { label: 'Position groups', href: '#position-groups' },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:border-brand hover:text-white transition"
            aria-label={item.label}
          >
            {item.label}
          </a>
        ))}
      </div>

      <div id="readiness">
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Readiness</p>
            <h2 className="text-base font-semibold text-slate-50">Operational snapshot</h2>
            <p className="text-sm text-slate-400">
              Live roster, staff access, and player status in one view.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <StatBadge label="Active roster" value={readiness.total} tone="cyan" />
            <StatBadge label="Limited / Out" value={`${readiness.limited} / ${readiness.out}`} tone="amber" />
            <StatBadge label="Staff" value={readiness.staff} tone="emerald" />
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <StatBadge label="Scout team" value={readiness.scout} tone="slate" />
          <StatBadge label="Questionable" value={readiness.questionable} tone="slate" />
          <StatBadge label="Pending invites" value={invites.length} tone="amber" />
          <StatBadge label="Ready" value={readiness.ready} tone="emerald" />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <Pill label={`Next return: ${nextReturn.label}`} tone="cyan" icon={<ActivitySquare className="h-3.5 w-3.5" />} />
          <Pill label="Manage roles" tone="slate" icon={<Crown className="h-3.5 w-3.5" />} />
          <CTAButton href="#staff" variant="secondary" size="sm" iconRight={<ArrowRight className="h-3 w-3" />}>
            Go to staff
          </CTAButton>
        </div>
      </GlassCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div id="roster">
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">Roster</h2>
              <p className="text-sm text-slate-400">Live player status, availability, and notes.</p>
            </div>
            <Pill label="Live roster" tone="emerald" icon={<Shield className="h-4 w-4" />} />
          </div>
          {safePlayers.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="h-10 w-10 text-amber-300" />}
              title="No players yet"
              description="Add your roster to unlock live tracking."
              action={
                <CTAButton href="#add-player" variant="primary" size="sm">
                  Add player
                </CTAButton>
              }
            />
          ) : (
            <PlayerGrid players={safePlayers} displayTimezone={DEFAULT_TIMEZONE} />
          )}
        </GlassCard>
        </div>

        <div id="add-player">
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Add player</h3>
              <p className="text-sm text-slate-400">Create a roster entry with jersey and position.</p>
            </div>
            <Pill label="New" tone="cyan" icon={<Sparkles className="h-3.5 w-3.5" />} />
          </div>
          <form
            action={async (formData) => {
              'use server'
              await addRosterPlayer(formData)
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <InputField label="First name" name="first_name" required placeholder="Jordan" />
            <InputField label="Last name" name="last_name" required placeholder="Greene" />
            <InputField label="Jersey" name="jersey_number" placeholder="12" type="number" />
            <InputField label="Position" name="position" placeholder="QB" />
            <InputField label="Unit" name="unit" placeholder="OFFENSE" />
            <InputField label="Class year" name="class_year" placeholder="2026" type="number" />
            <div className="sm:col-span-2 flex justify-end">
              <CTAButton type="submit" variant="primary">
                Add player
              </CTAButton>
            </div>
          </form>
        </GlassCard>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div id="staff">
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Staff & Roles</h3>
              <p className="text-sm text-slate-400">Manage access for coordinators, analysts, and admins.</p>
            </div>
            <Pill label="Roles" tone="cyan" icon={<Crown className="h-4 w-4" />} />
          </div>
          {staff.length === 0 ? (
            <EmptyState
              icon={<Users className="h-10 w-10 text-slate-400" />}
              title="No staff members yet"
              description="Invite staff to collaborate and chart live."
            />
          ) : (
            <div className="space-y-3">
              {staff.map((member) => (
                <div
                  key={member.user_id}
                  className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      {member.users?.full_name || 'Staff member'}
                    </p>
                    <p className="text-xs text-slate-400">{member.users?.email || 'Email unknown'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <form
                      action={async (formData) => {
                        'use server'
                        await updateStaffRole(formData)
                      }}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="member_user_id" value={member.user_id} />
                      <select
                        name="role"
                        defaultValue={member.role ?? ''}
                        className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                      >
                        {STAFF_ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <CTAButton type="submit" variant="secondary" size="sm">
                        Update
                      </CTAButton>
                    </form>
                    <form
                      action={async (formData) => {
                        'use server'
                        await removeStaffMember(formData)
                      }}
                    >
                      <input type="hidden" name="member_user_id" value={member.user_id} />
                      <CTAButton type="submit" variant="ghost" size="sm">
                        Remove
                      </CTAButton>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-3">
            <h4 className="text-sm font-semibold text-slate-100">Invite staff</h4>
            <form
              action={async (formData) => {
                'use server'
                await inviteStaffMember(formData)
              }}
              className="grid gap-2 md:grid-cols-[2fr,1fr,auto]"
            >
              <input
                type="email"
                name="email"
                required
                placeholder="coach@program.edu"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
              <select
                name="role"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                defaultValue={STAFF_ROLE_OPTIONS[0]?.value}
              >
                {STAFF_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <CTAButton type="submit" variant="primary" size="sm" iconLeft={<Mail className="h-4 w-4" />}>
                Send invite
              </CTAButton>
            </form>
            {invites.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pending invites</p>
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200"
                  >
                    <span>{invite.email || 'Unknown email'}</span>
                    <div className="flex items-center gap-2">
                      <Pill label={invite.role || 'Role'} tone="slate" />
                      <form
                        action={async (formData) => {
                          'use server'
                          await cancelStaffInvite(formData)
                        }}
                      >
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <CTAButton type="submit" variant="ghost" size="sm">
                          Cancel
                        </CTAButton>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
        </div>

        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Position groups</h3>
              <p className="text-sm text-slate-400">Units and groups synced across roster and charting.</p>
            </div>
            <Pill label="Groups" tone="slate" icon={<ClipboardList className="h-4 w-4" />} />
          </div>
          {positionGroups.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="h-10 w-10 text-amber-300" />}
              title="No position groups"
              description="Define groups to organize roster and charting."
              action={
                <CTAButton href="/settings#roster" variant="secondary" size="sm">
                  Manage in settings
                </CTAButton>
              }
            />
          ) : (
            <div className="space-y-2">
              {positionGroups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold">{group.group_name}</p>
                    <p className="text-xs text-slate-400">
                      {group.units?.join(', ') || 'Units TBD'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">Order {group.sort_order ?? 0}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </section>
  )
}

async function fetchTeamData(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  teamId: string
) {
  const [playerRes, staffRes, inviteRes, groupRes] = await Promise.all([
    supabase
      .from('players')
      .select(
        'id, first_name, last_name, jersey_number, position, unit, class_year, status, status_reason, return_target_date, pitch_count, packages, scout_team, tags'
      )
      .eq('team_id', teamId)
      .order('last_name', { ascending: true }),
    supabase
      .from('team_members')
      .select('user_id, role, users:users(full_name, email)')
      .eq('team_id', teamId)
      .order('role', { ascending: true }),
    supabase
      .from('team_invites')
      .select('id, email, role, status, created_at, expires_at')
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('team_position_groups')
      .select('id, group_name, units, sort_order')
      .eq('team_id', teamId)
      .order('sort_order', { ascending: true }),
  ])

  const players = (playerRes.data as PlayerRow[] | null) ?? []
  const staff = ((staffRes.data as StaffMemberRowRaw[] | null) ?? []).map((row) => ({
    ...row,
    users: Array.isArray(row.users) ? row.users[0] ?? null : row.users,
  }))
  const invites = (inviteRes.data as TeamInviteRow[] | null) ?? []
  const positionGroups = (groupRes.data as PositionGroupRow[] | null) ?? []

  return { players, staff, invites, positionGroups }
}

function buildReadiness(players: PlayerRow[], staff: StaffMemberRow[]) {
  const normalizeStatus = (value: string | null | undefined) => (value || '').toUpperCase()
  const ready = players.filter((p) => normalizeStatus(p.status) === 'READY').length
  const limited = players.filter((p) => normalizeStatus(p.status) === 'LIMITED').length
  const out = players.filter((p) => normalizeStatus(p.status) === 'OUT').length
  const questionable = players.filter((p) => normalizeStatus(p.status) === 'QUESTIONABLE').length
  const scout = players.filter((p) => p.scout_team).length
  const total = players.length
  const staffCount = staff.length

  return {
    ready,
    limited,
    out,
    questionable,
    scout,
    total,
    staff: staffCount,
  }
}

function buildNextReturn(players: PlayerRow[]) {
  const dates = players
    .map((p) => p.return_target_date)
    .filter(Boolean)
    .map((d) => new Date(d as string).getTime())
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)

  if (dates.length === 0) {
    return { label: 'No return targets set' }
  }

  const next = new Date(dates[0])
  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(next)

  return { label: formatted }
}
