import type { ReactNode } from 'react'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/clients'
import {
  addRosterPlayer,
  cancelStaffInvite,
  inviteStaffMember,
  removeRosterPlayer,
  removeStaffMember,
  savePositionGroups,
  updateNotificationPreferences,
  updateProfileIdentity,
  updateStaffRole,
  updateTeamBranding,
  updateSeasonMetadata,
} from './actions'
import {
  FALLBACK_PRIMARY_COLOR,
  HEX_COLOR_REGEX,
  POSITIONAL_GROUP_DEFAULTS,
  STAFF_ROLE_OPTIONS,
  notificationToggleFields,
  type NotificationToggleKey,
} from './constants'

const navItems = [
  { id: 'profile', label: 'Profile' },
  { id: 'team', label: 'Team & Tenant' },
  { id: 'roster', label: 'Roster & Staff' },
  { id: 'gameplay', label: 'Gameplay & Data' },
  { id: 'billing', label: 'Billing' },
  { id: 'security', label: 'Security' },
]

const notificationRows = [
  {
    id: 'ai',
    label: 'AI Suggestions',
    description: 'Live call prompts during games.',
    keys: {
      email: 'notify_ai_email',
      sms: 'notify_ai_sms',
      push: 'notify_ai_push',
    },
  },
  {
    id: 'reports',
    label: 'Post-game Reports',
    description: 'PDF + data exports after each game.',
    keys: {
      email: 'notify_reports_email',
      sms: 'notify_reports_sms',
      push: 'notify_reports_push',
    },
  },
  {
    id: 'billing',
    label: 'Billing & System Alerts',
    description: 'Invoices, renewal reminders, uptime notices.',
    keys: {
      email: 'notify_billing_email',
      sms: 'notify_billing_sms',
      push: 'notify_billing_push',
    },
  },
] satisfies Array<{
  id: string
  label: string
  description: string
  keys: Record<'email' | 'sms' | 'push', NotificationToggleKey>
}>

const rolePermissions = [
  {
    role: 'Head Coach',
    permissions: { scouting: 'edit', billing: 'edit', settings: 'edit' },
  },
  {
    role: 'Coordinator',
    permissions: { scouting: 'edit', billing: 'view', settings: 'view' },
  },
  {
    role: 'Analyst',
    permissions: { scouting: 'edit', billing: 'none', settings: 'view' },
  },
  {
    role: 'IT Admin',
    permissions: { scouting: 'view', billing: 'view', settings: 'edit' },
  },
]

const integrations = [
  {
    name: 'HUDL',
    status: 'Connected',
    description: 'Last synced 2h ago • Auto-import tags',
  },
  {
    name: 'Catapult',
    status: 'Not Connected',
    description: 'Push practice GPS data into BlitzIQ',
  },
  {
    name: 'OpenAI',
    status: 'Connected',
    description: 'Custom play-calling profile: Balanced',
  },
]

const invoices = [
  {
    id: 'INV-2038',
    period: 'Oct 2025',
    amount: '$1,200',
    status: 'Paid',
  },
  {
    id: 'INV-2039',
    period: 'Nov 2025',
    amount: '$1,200',
    status: 'Paid',
  },
]

const billingContacts = [
  { name: 'Kelly Shaw', email: 'kelly@ironridgehs.edu', role: 'Owner' },
  { name: 'Dana Ortiz', email: 'dortiz@ironridgehs.edu', role: 'Bookkeeper' },
]

const apiKeys = [
  {
    name: 'HUDL Sync',
    lastUsed: '2 hours ago',
    scope: 'Data ingest',
    status: 'Active',
  },
  {
    name: 'Reporting Webhook',
    lastUsed: '3 days ago',
    scope: 'Exports',
    status: 'Active',
  },
]

const auditLog = [
  {
    action: 'Invited analyst Maya Kim',
    actor: 'Kelly Shaw',
    timestamp: 'Today • 8:12 AM',
  },
  {
    action: 'Updated AI profile to Balanced',
    actor: 'Andre Waller',
    timestamp: 'Yesterday • 9:40 PM',
  },
  {
    action: 'Downloaded invoice INV-2038',
    actor: 'Dana Ortiz',
    timestamp: 'Yesterday • 4:11 PM',
  },
]

const usageStats = [
  { label: 'Teams Onboarded', value: '3 of 5' },
  { label: 'Games Logged', value: '18 this season' },
  { label: 'AI Calls', value: '412 / mo' },
]

type ProfileRow = {
  full_name: string | null
  title: string | null
  phone_number: string | null
  active_team_id: string | null
} & Partial<Record<NotificationToggleKey, boolean | null>>

type PlayerRow = {
  id: string
  first_name: string | null
  last_name: string | null
  jersey_number: string | null
  position: string | null
  unit: string | null
  class_year: number | null
}

type TeamBrandingRow = {
  id: string
  name: string | null
  school_name: string | null
  level: string | null
  logo_url: string | null
  primary_color: string | null
}

type TeamSettingsRow = {
  default_season_year: number | null
}

type PositionGroupRow = {
  id: string
  group_name: string | null
  units: string[] | null
  sort_order: number | null
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

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error('Error fetching auth user for settings:', authError.message)
  }

  const user = authData?.user

  if (!user) {
    redirect('/login')
  }

  const userEmail = user.email ?? ''

  const selectColumns = [
    'full_name',
    'title',
    'phone_number',
    'active_team_id',
    ...notificationToggleFields,
  ].join(', ')

  const {
    data: profileData,
    error: profileError,
  } = await supabase
    .from('users')
    .select(selectColumns)
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error fetching profile for settings:', profileError.message)
  }

  const profile = (profileData as ProfileRow | null) ?? null
  const profileFullName = profile?.full_name ?? ''
  const profileTitle = profile?.title ?? ''
  const profilePhone = profile?.phone_number ?? ''
  const profileDisplayName = profileFullName || userEmail
  const activeTeamId = profile?.active_team_id ?? null

  const notificationDefaults = notificationToggleFields.reduce<
    Record<NotificationToggleKey, boolean>
  >((acc, key) => {
    acc[key] = Boolean(profile?.[key] ?? false)
    return acc
  }, {} as Record<NotificationToggleKey, boolean>)

  let activeTeamName = 'Your Program'
  let activeTeamRole = 'Coach'
  let teamBrandingRow: TeamBrandingRow | null = null
  let teamSettingsRow: TeamSettingsRow | null = null
  let seasonLabel = ''
  let seasonYear = new Date().getFullYear()

  if (activeTeamId) {
    const {
      data: teamData,
      error: teamError,
    } = await supabase.from('teams').select('*').eq('id', activeTeamId).maybeSingle()

    if (teamError) {
      console.error('Error fetching active team:', teamError.message)
    } else if (teamData) {
      teamBrandingRow = teamData as TeamBrandingRow
      if (teamData.name) {
        activeTeamName = (teamData.name as string) || activeTeamName
      }
    }

    const {
      data: membershipData,
      error: membershipError,
    } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', activeTeamId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      console.error('Error fetching membership role:', membershipError.message)
    } else if (membershipData?.role) {
      activeTeamRole = (membershipData.role as string) || activeTeamRole
    }

    const {
      data: teamSettings,
      error: teamSettingsError,
    } = await supabase
      .from('team_settings')
      .select('default_season_year')
      .eq('team_id', activeTeamId)
      .maybeSingle()

    if (teamSettingsError) {
      console.error('Error fetching team settings:', teamSettingsError.message)
    } else if (teamSettings) {
      teamSettingsRow = teamSettings as TeamSettingsRow
      if (typeof teamSettingsRow.default_season_year === 'number') {
        seasonYear = teamSettingsRow.default_season_year
      }
    }

    if (teamSettingsRow?.default_season_year) {
      const {
        data: seasonRow,
        error: seasonError,
      } = await supabase
        .from('seasons')
        .select('label')
        .eq('team_id', activeTeamId)
        .eq('year', teamSettingsRow.default_season_year)
        .maybeSingle()

      if (seasonError) {
        console.error('Error fetching season label:', seasonError.message)
      } else if (seasonRow?.label) {
        seasonLabel = (seasonRow.label as string) ?? ''
      }
    }
  }

  const brandPrimaryColor = teamBrandingRow?.primary_color ?? FALLBACK_PRIMARY_COLOR
  const normalizedPrimaryColor = HEX_COLOR_REGEX.test(brandPrimaryColor)
    ? brandPrimaryColor
    : FALLBACK_PRIMARY_COLOR

  const rosterPlayers: PlayerRow[] = []
  const staffList: StaffMemberRow[] = []
  const pendingInvites: TeamInviteRow[] = []
  let positionGroupRows: PositionGroupRow[] = []

  if (activeTeamId) {
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('id, first_name, last_name, jersey_number, position, unit, class_year')
      .eq('team_id', activeTeamId)
      .order('last_name', { ascending: true })

    if (playerError) {
      console.error('Error fetching roster players:', playerError.message)
    } else if (playerData) {
      rosterPlayers.push(...((playerData as PlayerRow[]) || []))
    }

    const { data: groupData, error: groupError } = await supabase
      .from('team_position_groups')
      .select('id, group_name, units, sort_order')
      .eq('team_id', activeTeamId)
      .order('sort_order', { ascending: true })

    if (groupError) {
      console.error('Error fetching position groups:', groupError.message)
    } else if (groupData) {
      positionGroupRows = groupData as PositionGroupRow[]
    }

    const { data: staffData, error: staffError } = await supabase
      .from('team_members')
      .select('user_id, role, users:users(full_name, email)')
      .eq('team_id', activeTeamId)
      .order('role', { ascending: true })

    if (staffError) {
      console.error('Error fetching staff:', staffError.message)
    } else if (staffData) {
      const normalizedStaff = (staffData as StaffMemberRowRaw[]).map((row) => ({
        ...row,
        users: Array.isArray(row.users) ? row.users[0] ?? null : row.users,
      }))
      staffList.push(...normalizedStaff)
    }

    const { data: inviteData, error: inviteError } = await supabase
      .from('team_invites')
      .select('id, email, role, status, created_at, expires_at')
      .eq('team_id', activeTeamId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (inviteError) {
      console.error('Error fetching invites:', inviteError.message)
    } else if (inviteData) {
      pendingInvites.push(...((inviteData as TeamInviteRow[]) || []))
    }
  }

  const positionGroupFormRows: Array<{
    key: string
    id: string
    group_name: string
    units: string[]
  }> = (
    positionGroupRows.length > 0
      ? positionGroupRows.map((group, index) => ({
          key: group.id ?? `existing-${index}`,
          id: group.id ?? '',
          group_name: group.group_name ?? '',
          units: Array.isArray(group.units) ? group.units : [],
        }))
      : POSITIONAL_GROUP_DEFAULTS.map((group, index) => ({
          key: `default-${index}`,
          id: '',
          group_name: group.group,
          units: [...group.units],
        }))
  )

  // Add empty row for quick creation
  positionGroupFormRows.push({
    key: `new-${positionGroupFormRows.length}`,
    id: '',
    group_name: POSITIONAL_GROUP_DEFAULTS[0].group,
    units: [...POSITIONAL_GROUP_DEFAULTS[0].units],
  })

  const staffRoleSelectOptions = STAFF_ROLE_OPTIONS

  const wrapAction =
    (action: (formData: FormData) => Promise<unknown>) =>
    async (formData: FormData) => {
      await action(formData)
    }

  const updateProfileIdentityAction = wrapAction(updateProfileIdentity)
  const updateNotificationPreferencesAction = wrapAction(updateNotificationPreferences)
  const updateTeamBrandingAction = wrapAction(updateTeamBranding)
  const updateSeasonMetadataAction = wrapAction(updateSeasonMetadata)
  const updateStaffRoleAction = wrapAction(updateStaffRole)
  const removeStaffMemberAction = wrapAction(removeStaffMember)
  const cancelStaffInviteAction = wrapAction(cancelStaffInvite)
  const inviteStaffMemberAction = wrapAction(inviteStaffMember)
  const removeRosterPlayerAction = wrapAction(removeRosterPlayer)
  const addRosterPlayerAction = wrapAction(addRosterPlayer)
  const savePositionGroupsAction = wrapAction(savePositionGroups)

  const formatRoleLabel = (role: string | null) => {
    if (!role) return 'Unknown'
    const normalized = role.replace(/_/g, ' ').toLowerCase()
    return normalized
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <section className="space-y-10">
      <header className="space-y-3">
        <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
          {activeTeamName} • {activeTeamRole}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
          Settings & Control Center
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Manage your personal profile, program configuration, billing, and
          security from one surface. Changes apply to the current tenant unless
          noted otherwise.
          <span className="mt-2 block text-xs text-slate-500">
            Signed in as {profileDisplayName}
          </span>
        </p>
      </header>

      <div className="flex gap-3 overflow-x-auto lg:hidden pb-2 -mx-1 px-1">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="px-3 py-1.5 rounded-full border border-slate-800 text-xs text-slate-300 hover:text-slate-50 hover:border-slate-600 transition"
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px,1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-2xl border border-slate-800 bg-surface-raised">
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-900/70 hover:text-slate-50 transition"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-16">
          <SettingsSection id="profile" title="Personal Profile">
            <SettingsCard
              title="Identity"
              description="Update how you appear to staff inside BlitzIQ."
            >
              <form
                action={updateProfileIdentityAction}
                className="grid gap-4 md:grid-cols-2"
              >
                <label className="space-y-1 text-sm">
                  <span className="text-slate-300">Full Name</span>
                  <input
                    name="full_name"
                    type="text"
                    defaultValue={profileFullName}
                    required
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/40"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-300">Title</span>
                  <input
                    name="title"
                    type="text"
                    defaultValue={profileTitle}
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/40"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-300">Mobile Number</span>
                  <input
                    name="phone_number"
                    type="tel"
                    defaultValue={profilePhone}
                    placeholder="(555) 123-4567"
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/40"
                  />
                </label>
                <label className="space-y-1 text-sm md:col-span-2">
                  <span className="text-slate-300">Primary Email</span>
                  <input
                    type="email"
                    value={userEmail}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-slate-900/50 bg-slate-900/40 px-3 py-2 text-sm text-slate-500"
                  />
                  <p className="text-[0.7rem] text-slate-500">
                    Contact support if you need to change your sign-in email.
                  </p>
                </label>
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
                  >
                    Save profile
                  </button>
                </div>
              </form>
            </SettingsCard>

            <SettingsCard
              title="Alerts & Notifications"
              description="Choose how BlitzIQ keeps you informed."
            >
              <form action={updateNotificationPreferencesAction} className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-slate-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-black/40 text-slate-400">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Alert Type</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">SMS</th>
                        <th className="px-4 py-3 font-medium">Push</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notificationRows.map((item) => (
                        <tr
                          key={item.id}
                          className="border-t border-slate-900/40 text-slate-300"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.label}</div>
                            <p className="text-xs text-slate-500">{item.description}</p>
                          </td>
                          {(Object.keys(item.keys) as Array<'email' | 'sms' | 'push'>).map(
                            (channel) => {
                              const fieldKey = item.keys[channel]
                              const inputId = `${item.id}-${channel}`
                              return (
                                <td key={channel} className="px-4 py-3 text-center">
                                  <label
                                    htmlFor={inputId}
                                    className="inline-flex cursor-pointer items-center justify-center"
                                  >
                                    <input
                                      id={inputId}
                                      name={fieldKey}
                                      type="checkbox"
                                      defaultChecked={notificationDefaults[fieldKey]}
                                      className="peer sr-only"
                                    />
                                    <span className="inline-flex min-w-[70px] items-center justify-center rounded-full border border-slate-800 px-3 py-1 text-xs font-semibold text-slate-500 transition peer-checked:border-transparent peer-checked:bg-brand peer-checked:text-black">
                                      <span className="peer-checked:hidden">Off</span>
                                      <span className="hidden peer-checked:inline">On</span>
                                    </span>
                                  </label>
                                </td>
                              )
                            }
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full border border-brand px-4 py-1.5 text-xs font-semibold text-brand"
                  >
                    Save notification settings
                  </button>
                </div>
              </form>
            </SettingsCard>

            <SettingsCard
              title="Authentication"
              description="Keep your account secure while staying fast on game day."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-black/30 p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-200">Password</p>
                  <p className="text-xs text-slate-500">Last changed 42 days ago</p>
                  <button className="text-xs font-semibold text-brand">Update password</button>
                </div>
                <div className="rounded-xl border border-slate-800 bg-black/30 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-200">SSO Connections</p>
                  <div className="space-y-2 text-xs text-slate-400">
                    <p>Google • Connected</p>
                    <p>Microsoft • Not linked</p>
                    <p>District SSO • Connected</p>
                  </div>
                  <button className="text-xs font-semibold text-brand">Manage providers</button>
                </div>
              </div>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection id="team" title="Team & Tenant">
            <SettingsCard
              title="Branding & Identity"
              description="Logo, colors, and copy that appear across dashboards and exports."
            >
              <form action={updateTeamBrandingAction} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-slate-300">Program Name</span>
                    <input
                      type="text"
                      name="team_name"
                      defaultValue={teamBrandingRow?.name ?? ''}
                      required
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-slate-300">School / District</span>
                    <input
                      type="text"
                      name="school_name"
                      defaultValue={teamBrandingRow?.school_name ?? ''}
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-slate-300">Level / Classification</span>
                    <input
                      type="text"
                      name="team_level"
                      defaultValue={teamBrandingRow?.level ?? ''}
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-slate-300">Primary Color</span>
                    <input
                      type="color"
                      name="primary_color"
                      defaultValue={normalizedPrimaryColor}
                      className="h-10 w-full rounded-lg border border-slate-800 bg-black/30"
                    />
                  </label>
                  <label className="space-y-1 text-sm md:col-span-2">
                    <span className="text-slate-300">Logo URL</span>
                    <input
                      type="url"
                      name="logo_url"
                      placeholder="https://..."
                      defaultValue={teamBrandingRow?.logo_url ?? ''}
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {teamBrandingRow?.logo_url ? (
                    <div className="flex items-center gap-3">
                      <Image
                        src={teamBrandingRow.logo_url}
                        alt={`${teamBrandingRow.name || activeTeamName} logo`}
                        width={80}
                        height={48}
                        unoptimized
                        className="h-12 w-20 rounded-lg border border-slate-800 bg-black/30 object-contain"
                      />
                      <p className="text-xs text-slate-500">Preview</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Upload your logo to a CDN (S3, Supabase Storage) and paste the URL above.
                    </p>
                  )}
                  <button
                    type="submit"
                    className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-black"
                  >
                    Save branding
                  </button>
                </div>
              </form>
            </SettingsCard>

            <SettingsCard
              title="Season Metadata"
              description="Control the default season context for analytics and reports."
            >
              <form action={updateSeasonMetadataAction} className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-300">Season Year</span>
                  <input
                    type="number"
                    name="season_year"
                    min={1990}
                    max={2100}
                    defaultValue={seasonYear}
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm"
                    required
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-slate-300">Season Label</span>
                  <input
                    type="text"
                    name="season_label"
                    placeholder="2025 Varsity"
                    defaultValue={seasonLabel}
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm"
                  />
                </label>
                <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xs text-slate-500">
                    Season label is used in exports and reports. Leave blank to auto-generate.
                  </p>
                  <button
                    type="submit"
                    className="rounded-full border border-brand px-4 py-1.5 text-xs font-semibold text-brand"
                  >
                    Save season settings
                  </button>
                </div>
              </form>
            </SettingsCard>

            <SettingsCard
              title="Staff & Access"
              description="Invite new staff or update their permissions."
            >
              <div className="space-y-6">
                {staffList.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No staff members found for this tenant. Invite your coaches and analysts below.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-800">
                    <table className="min-w-full text-sm text-slate-300">
                      <thead className="bg-black/40 text-slate-400 text-left">
                        <tr>
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Email</th>
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="px-4 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffList.map((member) => {
                          const canEdit = member.role && member.role !== 'OWNER'
                          const email = member.users?.email ?? 'Unknown email'
                          const displayName =
                            member.users?.full_name || email || 'Pending user'
                          return (
                            <tr key={member.user_id} className="border-t border-slate-900/40">
                              <td className="px-4 py-3 font-semibold text-slate-100">
                                {displayName}
                              </td>
                              <td className="px-4 py-3 text-slate-400">{email}</td>
                              <td className="px-4 py-3">
                                {canEdit ? (
                                  <form
                                    action={updateStaffRoleAction}
                                    className="flex flex-wrap items-center gap-2"
                                  >
                                    <input type="hidden" name="member_user_id" value={member.user_id} />
                                    <select
                                      name="role"
                                      defaultValue={member.role ?? 'ANALYST'}
                                      className="rounded-lg border border-slate-800 bg-black/40 px-2 py-1 text-xs text-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/30"
                                    >
                                      {staffRoleSelectOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="submit"
                                      className="text-xs font-semibold text-brand"
                                    >
                                      Save
                                    </button>
                                  </form>
                                ) : (
                                  <span className="text-xs uppercase tracking-[0.16em] text-slate-400">
                                    {formatRoleLabel(member.role)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {canEdit ? (
                                  <form action={removeStaffMemberAction}>
                                    <input
                                      type="hidden"
                                      name="member_user_id"
                                      value={member.user_id}
                                    />
                                    <button className="text-xs font-semibold text-red-400">
                                      Remove
                                    </button>
                                  </form>
                                ) : (
                                  <span className="text-xs text-slate-600">Protected</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {pendingInvites.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                    <p className="text-xs font-semibold text-amber-200 uppercase tracking-[0.2em]">
                      Pending invites
                    </p>
                    <div className="space-y-2">
                      {pendingInvites.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm text-amber-100"
                        >
                          <div>
                            <p className="font-medium">{invite.email}</p>
                            <p className="text-xs text-amber-200/80">
                              {formatRoleLabel(invite.role)} • Sent{' '}
                              {invite.created_at
                                ? new Date(invite.created_at).toLocaleDateString()
                                : 'Recently'}
                            </p>
                          </div>
                          <form action={cancelStaffInviteAction}>
                            <input type="hidden" name="invite_id" value={invite.id} />
                            <button className="text-xs font-semibold text-amber-200">
                              Cancel
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form
                  action={inviteStaffMemberAction}
                  className="grid gap-3 md:grid-cols-[2fr_1fr_auto]"
                >
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">Email</span>
                    <input
                      type="email"
                      name="invite_email"
                      required
                      placeholder="coach@yourprogram.com"
                      className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">Role</span>
                    <select
                      name="invite_role"
                      className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                      defaultValue="COORDINATOR"
                    >
                      {staffRoleSelectOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
                    >
                      Send invite
                    </button>
                  </div>
                </form>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Role Permissions"
              description="Configure RBAC rules so every role sees the right surfaces."
            >
              <div className="overflow-hidden rounded-2xl border border-slate-800">
                <table className="min-w-full text-sm text-slate-300">
                  <thead className="bg-black/40 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Scouting</th>
                      <th className="px-4 py-3 font-medium">Billing</th>
                      <th className="px-4 py-3 font-medium">Settings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rolePermissions.map((role) => (
                      <tr key={role.role} className="border-t border-slate-900/40">
                        <td className="px-4 py-3 font-semibold text-slate-100">{role.role}</td>
                        {Object.values(role.permissions).map((value, idx) => (
                          <td key={`${role.role}-${idx}`} className="px-4 py-3 text-center">
                            <span className="rounded-full border border-slate-800 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                              {value}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection id="roster" title="Roster & Staff Settings">
            <SettingsCard
              title="Roster"
              description="Keep players current without double-entry."
            >
              <div className="space-y-6">
                {rosterPlayers.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No players have been added yet. Use the form below to start building your roster.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-800">
                    <table className="min-w-full text-sm text-slate-300">
                      <thead className="bg-black/40 text-slate-400">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Player</th>
                          <th className="px-4 py-3 font-medium">Position</th>
                          <th className="px-4 py-3 font-medium">Unit</th>
                          <th className="px-4 py-3 font-medium">Class</th>
                          <th className="px-4 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rosterPlayers.map((player) => (
                          <tr key={player.id} className="border-t border-slate-900/40">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-100">
                                {player.jersey_number ? `#${player.jersey_number} ` : ''}
                                {player.first_name} {player.last_name}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {player.position || '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-400">{player.unit || '—'}</td>
                            <td className="px-4 py-3 text-slate-400">
                              {player.class_year ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              <form action={removeRosterPlayerAction}>
                                <input type="hidden" name="player_id" value={player.id} />
                                <button className="text-xs font-semibold text-red-400">
                                  Remove
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <form
                  action={addRosterPlayerAction}
                  className="grid gap-4 md:grid-cols-[repeat(3,minmax(0,1fr))]"
                >
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">First name</span>
                    <input
                      type="text"
                      name="first_name"
                      required
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">Last name</span>
                    <input
                      type="text"
                      name="last_name"
                      required
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">Jersey #</span>
                    <input
                      type="text"
                      name="jersey_number"
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">Position</span>
                    <input
                      type="text"
                      name="position"
                      placeholder="QB, CB, etc."
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">Unit / Group</span>
                    <input
                      type="text"
                      name="unit"
                      placeholder="Offense, DL, Specialists"
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">Class year</span>
                    <input
                      type="number"
                      name="class_year"
                      min={1990}
                      max={2100}
                      placeholder="2026"
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="rounded-full border border-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand"
                    >
                      Add player
                    </button>
                  </div>
                </form>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Positional Groupings"
              description="Drive charting templates and reporting groups."
            >
              <form action={savePositionGroupsAction} className="space-y-4">
                <div className="space-y-3">
                  {positionGroupFormRows.map((group, index) => (
                    <div
                      key={group.key}
                      className="rounded-2xl border border-slate-800 bg-black/30 p-4 space-y-3"
                    >
                      <input type="hidden" name="group_keys" value={group.key} />
                      {group.id && (
                        <input type="hidden" name={`group_id_${group.key}`} value={group.id} />
                      )}
                      <label className="space-y-1 text-xs text-slate-400">
                        <span className="uppercase tracking-[0.2em]">Group name</span>
                        <input
                          type="text"
                          name={`group_name_${group.key}`}
                          defaultValue={group.group_name}
                          placeholder={index === positionGroupFormRows.length - 1 ? 'New group' : ''}
                          className="w-full rounded-lg border border-slate-800 bg-black/20 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                        />
                      </label>
                      <label className="space-y-1 text-xs text-slate-400">
                        <span className="uppercase tracking-[0.2em]">Units (comma separated)</span>
                        <input
                          type="text"
                          name={`group_units_${group.key}`}
                          defaultValue={group.units.join(', ')}
                          placeholder="QB, RB, WR"
                          className="w-full rounded-lg border border-slate-800 bg-black/20 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                        />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
                  >
                    Save groups
                  </button>
                </div>
              </form>
            </SettingsCard>

            <SettingsCard
              title="Default Charting Tags"
              description="Analysts can move faster when tags match your language."
            >
              <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-300">
                <div className="rounded-xl border border-slate-800 bg-black/30 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Personnel</p>
                  <p>11, 12, 20, 21, 10</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-black/30 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Formations</p>
                  <p>Trips Right, Trey Left, Bunch, Empty</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-black/30 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Explosive Plays</p>
                  <p>Runs ≥ 12 yds • Pass ≥ 18 yds</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-black/30 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Success Criteria</p>
                  <p>1st: 4 yds • 2nd: 70% • 3rd/4th: convert</p>
                </div>
              </div>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection id="gameplay" title="Gameplay & Data Preferences">
            <SettingsCard
              title="AI Recommendation Profile"
              description="Tune how aggressive the AI should be by situation."
            >
              <div className="grid gap-4 md:grid-cols-3">
                {['Aggressive', 'Balanced', 'Conservative'].map((profile) => (
                  <button
                    key={profile}
                    className={`rounded-2xl border px-4 py-6 text-left transition ${
                      profile === 'Balanced'
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-slate-800 bg-black/20 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-sm font-semibold">{profile}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {profile === 'Aggressive' && 'Go for high leverage moments.'}
                      {profile === 'Balanced' && 'Blend field position + analytics.'}
                      {profile === 'Conservative' && 'Prioritize field position control.'}
                    </p>
                  </button>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard
              title="Integrations"
              description="Connect the tools you already use."
            >
              <div className="space-y-3">
                {integrations.map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between rounded-2xl border border-slate-800 bg-black/30 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-100">
                        {integration.name}
                      </p>
                      <p className="text-xs text-slate-500">{integration.description}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        integration.status === 'Connected'
                          ? 'text-emerald-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {integration.status}
                    </span>
                  </div>
                ))}
              </div>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection id="billing" title="Billing & Subscription">
            <SettingsCard
              title="Plan Overview"
              description="Usage applies across the Iron Ridge tenant."
              actions={
                <button className="rounded-full border border-brand px-4 py-1.5 text-xs font-semibold text-brand">
                  Manage plan
                </button>
              }
            >
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                {usageStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-800 bg-black/20 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-100">{stat.value}</p>
                  </div>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard
              title="Payment & Invoices"
              description="Billing contacts control the subscription."
            >
              <div className="grid gap-6 lg:grid-cols-[1fr,1.2fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-800 bg-black/30 p-4 space-y-2 text-sm">
                    <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">
                      Payment method
                    </p>
                    <p className="font-semibold text-slate-100">Visa •••• 4242</p>
                    <p className="text-xs text-slate-500">Expires 04/27</p>
                    <button className="text-xs font-semibold text-brand">Update card</button>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-black/30 p-4 space-y-3 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Contacts</p>
                    {billingContacts.map((contact) => (
                      <div key={contact.email}>
                        <p className="font-semibold text-slate-100">{contact.name}</p>
                        <p className="text-xs text-slate-500">
                          {contact.email} • {contact.role}
                        </p>
                      </div>
                    ))}
                    <button className="text-xs font-semibold text-brand">Add contact</button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-800">
                  <table className="min-w-full text-sm text-slate-300">
                    <thead className="bg-black/40 text-slate-400">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Invoice</th>
                        <th className="px-4 py-3 font-medium">Period</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-t border-slate-900/40">
                          <td className="px-4 py-3 font-semibold text-slate-100">
                            {invoice.id}
                          </td>
                          <td className="px-4 py-3">{invoice.period}</td>
                          <td className="px-4 py-3">{invoice.amount}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection id="security" title="Security & Access">
            <SettingsCard
              title="Multi-factor Authentication"
              description="Recommended for all staff roles."
              actions={
                <button className="rounded-full bg-brand text-black px-4 py-1.5 text-xs font-semibold">
                  Enable MFA
                </button>
              }
            >
              <p className="text-sm text-slate-400">
                MFA is currently optional for this tenant. Enforcing MFA will prompt staff to enroll
                during next sign-in.
              </p>
            </SettingsCard>

            <SettingsCard
              title="API Keys"
              description="Secure integrations powered by scoped keys."
            >
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div
                    key={key.name}
                    className="rounded-2xl border border-slate-800 bg-black/30 p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{key.name}</p>
                      <p className="text-xs text-slate-500">
                        {key.scope} • Last used {key.lastUsed}
                      </p>
                    </div>
                    <button className="text-xs font-semibold text-brand">Revoke</button>
                  </div>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard
              title="Audit Log"
              description="Trace actions across users, settings, and data."
              actions={<button className="text-xs font-semibold text-brand">View full history</button>}
            >
              <div className="space-y-3 text-sm text-slate-300">
                {auditLog.map((entry) => (
                  <div
                    key={`${entry.action}-${entry.timestamp}`}
                    className="rounded-2xl border border-slate-900/60 bg-black/20 p-4"
                  >
                    <p className="font-semibold text-slate-100">{entry.action}</p>
                    <p className="text-xs text-slate-500">
                      {entry.actor} • {entry.timestamp}
                    </p>
                  </div>
                ))}
              </div>
            </SettingsCard>
          </SettingsSection>
        </div>
      </div>
    </section>
  )
}

function SettingsSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="space-y-6 scroll-mt-24">
      <div>
        <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">Section</p>
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  )
}

function SettingsCard({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-3xl border border-slate-900/70 bg-surface-raised/60 p-6 space-y-4 shadow-inner shadow-black/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          {description && <p className="text-sm text-slate-400">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}
