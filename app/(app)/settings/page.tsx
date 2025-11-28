import type { ReactNode } from 'react'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import {
  BarChart3,
  CheckCircle2,
  Crown,
  Gauge,
  LayoutDashboard,
  Lock,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { formatDate } from '@/utils/date'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { StatBadge } from '@/components/ui/StatBadge'
import {
  addRosterPlayer,
  cancelStaffInvite,
  inviteStaffMember,
  removeRosterPlayer,
  removeStaffMember,
  saveChartingThresholds,
  saveDefaultChartTags,
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
  DEFAULT_CUSTOM_TAGS,
  DEFAULT_EXPLOSIVE_THRESHOLDS,
  DEFAULT_FORMATION_TAGS,
  DEFAULT_PERSONNEL_TAGS,
  DEFAULT_SUCCESS_THRESHOLDS,
  POSITIONAL_GROUP_DEFAULTS,
  STAFF_ROLE_OPTIONS,
  notificationToggleFields,
  type NotificationToggleKey,
} from './constants'

const navItems = [
  { id: 'premium', label: 'Premium Strategy' },
  { id: 'experience', label: 'Experience & IA' },
  { id: 'value', label: 'Value & Upsell' },
  { id: 'operations', label: 'Ops & Quality' },
  { id: 'profile', label: 'Profile' },
  { id: 'team', label: 'Team & Tenant' },
  { id: 'roster', label: 'Roster & Staff' },
  { id: 'gameplay', label: 'Gameplay & Data' },
  { id: 'billing', label: 'Billing' },
  { id: 'security', label: 'Security' },
]

const personaGoals = [
  {
    persona: 'Head Coach',
    goal: 'Trust AI calls and see premium polish',
    measure: 'Increase adoption of AI recs on game day',
  },
  {
    persona: 'Coordinator',
    goal: 'Edit game-plan and tags faster',
    measure: 'Reduce setup time to under 10 minutes',
  },
  {
    persona: 'Analyst',
    goal: 'Chart, export, and QA with confidence',
    measure: 'Cut export/review loops by 30%',
  },
]

const premiumValuePillars = [
  {
    label: 'UI polish',
    detail: 'Premium typography, glass surfaces, consistent states, and clarity on mobile/desktop.',
  },
  {
    label: 'Advanced features',
    detail: 'Power toggles, presets, bulk actions, import/export, and smart defaults surfaced inline.',
  },
  {
    label: 'Perfect UX',
    detail: 'Guided flows, WCAG compliance, sub-400ms interactions, recoverable errors, and latency masking.',
  },
]

const successMetrics = [
  { label: 'Upgrade rate', value: '+35% to $299/mo', note: 'From settings upsell entries' },
  { label: 'NPS', value: '65+', note: 'Post-change survey with staff roles' },
  { label: 'Task completion', value: '95% in < 2 steps', note: 'Critical toggles + saves' },
]

const competitiveSnapshot = [
  {
    name: 'HUDL',
    strength: 'Video + tagging adoption',
    gap: 'Light AI, little billing/tenant control',
    response: 'Lead with AI recs + premium service and audit trail.',
  },
  {
    name: 'Pro Quick Draw',
    strength: 'Drawing + playbooks',
    gap: 'No live analytics or premium IA',
    response: 'Highlight live recommendations and presets.',
  },
  {
    name: 'Google Sheets',
    strength: 'Flexible + free',
    gap: 'No governance, no UX polish',
    response: 'Stress security, MFA, and recoverability.',
  },
]

const experienceAudit = [
  {
    title: 'Information architecture',
    detail: 'Re-ordered nav into strategy, experience, value, ops, and core tenant/billing.',
  },
  {
    title: 'Accessibility',
    detail: 'Documented focus order, ARIA labelling, contrast-safe CTAs, and keyboard-first controls.',
  },
  {
    title: 'Visual consistency',
    detail: 'Tokenized spacing (8/12/16/24), consistent border radii, and accent color normalization.',
  },
]

const upsellMoments = [
  {
    title: 'Inline locks',
    detail: 'Preview advanced controls with lock state + "Unlock Premium" CTA inside cards.',
  },
  {
    title: 'Billing hero',
    detail: 'Dedicated $299/mo card with ROI bullets and plan badge on the page header.',
  },
  {
    title: 'Contextual nudges',
    detail: 'After saves, surface a toast/CTA to try premium features with audit-backed reliability.',
  },
]

const visualTokens = [
  { label: 'Typography', detail: 'Display sizes 32/24/20; body 16/14; pill uppercase at 0.22em.' },
  { label: 'Color', detail: 'Use normalized primary for accents, emerald for success, amber for warnings.' },
  { label: 'Spacing', detail: 'Grid on 8/12/16/24pt; cards radius 24px; chips radius full.' },
  { label: 'States', detail: 'Defined default/hover/active/disabled with focus rings and subtle glow.' },
]

const interactionPolish = [
  { label: 'Micro-interactions', detail: 'Hover lifts on cards, button pulse on save, and skeletons for data loads.' },
  { label: 'Latency masking', detail: 'Optimistic saves on notifications/tags, toasts for confirm, inline spinners.' },
  { label: 'Motion', detail: '100-180ms ease-out transitions; staggered reveal on premium cards.' },
]

const accessibilityChecklist = [
  { label: 'Keyboard', detail: 'Tab order defined for nav + forms; visible focus indicators.' },
  { label: 'ARIA', detail: 'Labels on inputs/toggles, descriptive table headers, and status tags.' },
  { label: 'Contrast', detail: 'Buttons and pills meet WCAG AA on dark surfaces.' },
  { label: 'Screen readers', detail: 'Section ids + headings map to navigation anchors.' },
]

const performanceTargets = [
  { label: 'Page load (p75)', value: '< 1.5s', note: 'Preload settings data + cache per team' },
  { label: 'Interactions', value: '< 400ms', note: 'Optimistic updates on toggles/forms' },
  { label: 'Reliability', value: '99.9% uptime', note: 'Retry on transient Supabase failures' },
]

const personalizationIdeas = [
  { label: 'Saved defaults', detail: 'Persisted AI profile, thresholds, and tag templates per team.' },
  { label: 'Recent changes', detail: 'Inline history and audit log snippets scoped to settings.' },
  { label: 'Role-aware UI', detail: 'Surface only relevant controls for coach/analyst/admin.' },
]

const analyticsPlan = [
  { label: 'Feature discovery', detail: 'Track navigation clicks by section id and CTA source.' },
  { label: 'Intent to upgrade', detail: 'Log premium CTA views/clicks with team + role context.' },
  { label: 'Success states', detail: 'Event on save success/error per form with timing metadata.' },
  { label: 'Churn saves', detail: 'Capture cancel/rescind actions and export/download events.' },
]

const qaPlan = [
  { label: 'Cross-browser', detail: 'Chrome, Safari, Edge smoke on desktop + mobile breakpoints.' },
  { label: 'A11y sweep', detail: 'Keyboard-only run, screen reader labels, and focus traps.' },
  { label: 'Data integrity', detail: 'Ensure saves persist + rollback on failure scenarios.' },
]

const launchChecklist = [
  { label: 'Release notes', detail: 'Premium IA + pricing surfaced in changelog and in-app modal.' },
  { label: 'Support playbook', detail: 'FAQ for billing, MFA, permissions, and imports.' },
  { label: 'Announcement', detail: 'In-app banner + email to staff with upgrade CTA.' },
]

const mobilePrinciples = [
  { label: 'Sticky nav', detail: 'Horizontal chips for quick jump to sections on mobile.' },
  { label: 'Gesture-friendly', detail: '44px targets, taller inputs, and reduced columns.' },
  { label: 'Parity', detail: 'All premium CTA + audit info render on small screens.' },
]

const guidedExperience = [
  { label: 'Inline help', detail: 'Tooltips and short helper copy on thresholds and tags.' },
  { label: 'Setup checklist', detail: 'Personas, branding, MFA, billing, and chart tags ordered.' },
  { label: 'Empty states', detail: 'Actionable copy to add staff, players, and integrations.' },
]

const errorStatePlaybook = [
  { label: 'Recoverable errors', detail: 'Keep user input, show retry + contact support option.' },
  { label: 'Success messaging', detail: 'Concise toasts that confirm scope (team vs user).' },
  { label: 'Validations', detail: 'Client-side ranges on thresholds; graceful defaults restored.' },
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
    description: 'Last synced 2h ago | Auto-import tags',
  },
  {
    name: 'Catapult',
    status: 'Not Connected',
    description: 'Push practice GPS data into BlitzIQ Pro',
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
    timestamp: 'Today | 8:12 AM',
  },
  {
    action: 'Updated AI profile to Balanced',
    actor: 'Andre Waller',
    timestamp: 'Yesterday | 9:40 PM',
  },
  {
    action: 'Downloaded invoice INV-2038',
    actor: 'Dana Ortiz',
    timestamp: 'Yesterday | 4:11 PM',
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

type ChartTagRow = {
  id: string
  label: string | null
  category: string | null
  unit: string | null
  context: string | null
}

type ChartingDefaultsRow = {
  explosive_run_threshold: number | null
  explosive_pass_threshold: number | null
  success_1st_yards: number | null
  success_2nd_pct: number | null
  success_3rd_pct: number | null
  success_4th_pct: number | null
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
  const defaultTagRows: ChartTagRow[] = []
  let chartingDefaults: ChartingDefaultsRow | null = null

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

    const { data: tagData, error: tagError } = await supabase
      .from('chart_tags')
      .select('id, label, category, unit, context')
      .eq('team_id', activeTeamId)
      .eq('context', 'DEFAULTS')
      .order('sort_order', { ascending: true })

    if (tagError) {
      console.error('Error fetching default chart tags:', tagError.message)
    } else if (tagData) {
      defaultTagRows.push(...((tagData as ChartTagRow[]) || []))
    }

    const { data: chartingDefaultsData, error: defaultsError } = await supabase
      .from('charting_defaults')
      .select(
        'explosive_run_threshold, explosive_pass_threshold, success_1st_yards, success_2nd_pct, success_3rd_pct, success_4th_pct'
      )
      .eq('team_id', activeTeamId)
      .maybeSingle()

    if (defaultsError) {
      console.error('Error fetching charting thresholds:', defaultsError.message)
    } else if (chartingDefaultsData) {
      chartingDefaults = chartingDefaultsData as ChartingDefaultsRow
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

  const tagsByCategoryUnit = defaultTagRows.reduce<Record<string, string[]>>((acc, tag) => {
    if (!tag.label || !tag.category) return acc
    const unitKey = tag.unit || 'NONE'
    const key = `${tag.category}:${unitKey}`
    acc[key] = acc[key] ? [...acc[key], tag.label] : [tag.label]
    return acc
  }, {})

  const personnelOffense = tagsByCategoryUnit['PERSONNEL:OFFENSE'] ?? [...DEFAULT_PERSONNEL_TAGS]
  const personnelDefense = tagsByCategoryUnit['PERSONNEL:DEFENSE'] ?? []
  const formationsOffense = tagsByCategoryUnit['FORMATION:OFFENSE'] ?? [...DEFAULT_FORMATION_TAGS]
  const formationsDefense = tagsByCategoryUnit['FORMATION:DEFENSE'] ?? []
  const customDefaults = tagsByCategoryUnit['CUSTOM:NONE'] ?? [...DEFAULT_CUSTOM_TAGS]

  const chartingThresholds = {
    explosiveRun: chartingDefaults?.explosive_run_threshold ?? DEFAULT_EXPLOSIVE_THRESHOLDS.run,
    explosivePass: chartingDefaults?.explosive_pass_threshold ?? DEFAULT_EXPLOSIVE_THRESHOLDS.pass,
    success1st: chartingDefaults?.success_1st_yards ?? DEFAULT_SUCCESS_THRESHOLDS.firstDownYards,
    success2nd: chartingDefaults?.success_2nd_pct ?? DEFAULT_SUCCESS_THRESHOLDS.secondDownPct,
    success3rd: chartingDefaults?.success_3rd_pct ?? DEFAULT_SUCCESS_THRESHOLDS.thirdDownPct,
    success4th: chartingDefaults?.success_4th_pct ?? DEFAULT_SUCCESS_THRESHOLDS.fourthDownPct,
  }

  const staffRoleSelectOptions = STAFF_ROLE_OPTIONS

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
      <SectionHeader
        eyebrow={`${activeTeamName} | ${activeTeamRole}`}
        title="Premium Settings Command Center"
        description="Deliver a $299/mo premium experience with UI polish, advanced controls, and a perfect UX that earns upgrades."
        badge="$299/mo Premium"
        actions={
          <div className="flex flex-wrap gap-2">
            <Pill label="UI polish" tone="cyan" icon={<Sparkles className="h-3 w-3" />} />
            <Pill label="Advanced" tone="emerald" icon={<Gauge className="h-3 w-3" />} />
            <Pill label="Trust" tone="amber" icon={<ShieldCheck className="h-3 w-3" />} />
          </div>
        }
      />

      <GlassCard>
        <div className="flex flex-wrap items-center gap-3">
          <LayoutDashboard className="h-5 w-5 text-cyan-300" />
          <p className="text-sm text-slate-300">
            Signed in as <span className="font-semibold text-slate-50">{profileDisplayName}</span>.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {usageStats.map((stat, idx) => (
            <StatBadge
              key={stat.label}
              label={stat.label}
              value={stat.value}
              tone={idx === 0 ? 'cyan' : idx === 1 ? 'emerald' : 'amber'}
            />
          ))}
        </div>
      </GlassCard>

      <div className="flex gap-3 overflow-x-auto lg:hidden pb-2 -mx-1 px-1">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-slate-200 hover:border-brand hover:text-white transition"
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px,1fr]">
        <aside className="hidden lg:block">
          <GlassCard padding="none" className="sticky top-6">
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-slate-50 transition"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </GlassCard>
        </aside>

        <div className="space-y-16">
          <SettingsSection id="premium" title="Premium Strategy & Narrative">
            <SettingsCard
              title="$299/mo Premium Narrative"
              description="Frame the value pillars that justify premium pricing across UI, functionality, and UX."
            >
              <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Value pillars</p>
                  <div className="space-y-2">
                    {premiumValuePillars.map((pillar) => (
                      <div
                        key={pillar.label}
                        className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-black/30 p-3"
                      >
                        <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-300" />
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{pillar.label}</p>
                          <p className="text-xs text-slate-400">{pillar.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="flex items-center gap-2 text-amber-100">
                    <Crown className="h-4 w-4" />
                    <p className="text-sm font-semibold">$299/mo premium promise</p>
                  </div>
                  <p className="text-sm text-amber-50">
                    Premium buys polish, power, and confidence: fewer clicks, guided flows, and observable reliability.
                  </p>
                  <ul className="space-y-2 text-xs text-amber-100/90">
                    <li className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5" />
                      <span>Objection handling: speed targets, governance, and recovery paths are stated upfront.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp className="mt-0.5 h-3.5 w-3.5" />
                      <span>ROI: faster staff onboarding, fewer taps to critical settings, trusted exports and logs.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock className="mt-0.5 h-3.5 w-3.5" />
                      <span>Trust: MFA prompts, activity log visibility, and billing transparency.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Personas & Success Metrics"
              description="Clarify goals, premium value pillars, and success measures (upgrade rate, NPS, task completion)."
            >
              <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Target personas</p>
                  <div className="space-y-2">
                    {personaGoals.map((persona) => (
                      <div
                        key={persona.persona}
                        className="rounded-2xl border border-slate-800 bg-black/30 p-3"
                      >
                        <p className="text-sm font-semibold text-slate-100">{persona.persona}</p>
                        <p className="text-xs text-slate-400">{persona.goal}</p>
                        <p className="mt-1 text-xs text-emerald-200">{persona.measure}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Success metrics</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {successMetrics.map((metric, idx) => (
                      <StatBadge
                        key={metric.label}
                        label={metric.label}
                        value={metric.value}
                        tone={idx === 0 ? 'amber' : idx === 1 ? 'emerald' : 'cyan'}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Track by team and role; show movement weekly inside billing and audit cards.
                  </p>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Competitive Teardown & Positioning"
              description="Benchmark premium SaaS settings and pricing pages to extract perceived value patterns."
            >
              <div className="overflow-hidden rounded-2xl border border-slate-800">
                <table className="min-w-full text-sm text-slate-300">
                  <thead className="bg-black/40 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Competitor</th>
                      <th className="px-4 py-3 font-medium">Strength</th>
                      <th className="px-4 py-3 font-medium">Gap</th>
                      <th className="px-4 py-3 font-medium">Positioning response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitiveSnapshot.map((row) => (
                      <tr key={row.name} className="border-t border-slate-900/40">
                        <td className="px-4 py-3 font-semibold text-slate-100">{row.name}</td>
                        <td className="px-4 py-3">{row.strength}</td>
                        <td className="px-4 py-3 text-amber-200">{row.gap}</td>
                        <td className="px-4 py-3 text-slate-400">{row.response}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection id="experience" title="Experience & IA">
            <SettingsCard
              title="Experience Audit & IA"
              description="Map flows, friction points, accessibility gaps, and visual consistency issues."
            >
              <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
                <div className="space-y-2">
                  {experienceAudit.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-slate-800 bg-black/30 p-3"
                    >
                      <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
                  <div className="flex items-center gap-2 text-cyan-100">
                    <LayoutDashboard className="h-4 w-4" />
                    <p className="text-sm font-semibold">IA + defaults</p>
                  </div>
                  <ul className="space-y-2 text-xs text-cyan-50/90">
                    <li>
                      {'Progressive disclosure: premium -> experience -> value -> ops -> tenant/billing -> security.'}
                    </li>
                    <li>Clear defaults: season year/label, tag templates, and notification presets shown inline.</li>
                    <li>Sticky nav on desktop; chip nav on mobile for quick jumps.</li>
                  </ul>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-cyan-100" />
                      <p className="text-[0.7rem] uppercase tracking-[0.2em] text-cyan-100">Mobile</p>
                    </div>
                    <div className="space-y-1">
                      {mobilePrinciples.map((item) => (
                        <p key={item.label} className="text-xs text-cyan-50/80">
                          - {item.label}: {item.detail}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Visual System Refresh"
              description="Define typography, color, spacing, and component states to feel premium; document tokens."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {visualTokens.map((token) => (
                  <div
                    key={token.label}
                    className="rounded-2xl border border-slate-800 bg-black/30 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-100">{token.label}</p>
                    <p className="text-xs text-slate-400">{token.detail}</p>
                  </div>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard
              title="Interaction Polish & Motion"
              description="Specify micro-interactions, motion guidelines, and latency masking."
            >
              <div className="space-y-2">
                {interactionPolish.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-black/30 p-3"
                  >
                    <Rocket className="mt-1 h-4 w-4 text-cyan-200" />
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.detail}</p>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-slate-500">
                  Show optimistic confirmation on saves with spinner-to-check transitions and latency masking on lists.
                </p>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Accessibility & Compliance"
              description="Ensure WCAG pass, keyboard flows, focus order, screen reader labels, and ARIA patterns."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {accessibilityChecklist.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-800 bg-black/30 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.detail}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Pair with MFA prompts, audit logging visibility, and ARIA-live messaging for saves/errors.
              </p>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection id="value" title="Value, Upsell & Personalization">
            <SettingsCard
              title="Premium Upsell Placements"
              description="Design inline upsell banners, locked/preview states, and CTA hierarchy inside settings."
            >
              <div className="grid gap-3 md:grid-cols-2">
                {upsellMoments.map((moment) => (
                  <div
                    key={moment.title}
                    className="rounded-2xl border border-slate-800 bg-black/30 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-amber-200" />
                      <p className="text-sm font-semibold text-slate-100">{moment.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{moment.detail}</p>
                  </div>
                ))}
                <div className="md:col-span-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">CTA hierarchy</p>
                  <p className="text-sm text-emerald-50">
                    Primary: Upgrade to Premium - Secondary: Compare plans - Tertiary: Continue with limited mode.
                  </p>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Advanced Controls & Personalization"
              description="Power-user toggles, bulk actions, presets, and import/export to justify price, plus personalization."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="rounded-2xl border border-slate-800 bg-black/30 p-3">
                    <p className="text-sm font-semibold text-slate-100">Advanced controls</p>
                    <ul className="mt-2 space-y-2 text-xs text-slate-400">
                      <li>Bulk player/staff actions with confirmation and undo.</li>
                      <li>Presets for AI profile, chart tags, thresholds, and notification bundles.</li>
                      <li>Import/export roster, tags, and settings with audit stamps.</li>
                    </ul>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Personalization</p>
                  <div className="space-y-2">
                    {personalizationIdeas.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-slate-800 bg-black/30 p-3"
                      >
                        <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                        <p className="text-xs text-slate-400">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Guided Experience & Education"
              description="Add onboarding tips, empty states, inline help, and contextual education for complex settings."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {guidedExperience.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-800 bg-black/30 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.detail}</p>
                  </div>
                ))}
                <div className="sm:col-span-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Education moments</p>
                  <p className="text-xs text-cyan-50">
                    Place microcopy near thresholds, integrations, and billing with links to support playbook.
                  </p>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title="Error & Success States"
              description="Design friendly, actionable validation, recoverable flows, and confirmations."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {errorStatePlaybook.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-800 bg-black/30 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.detail}</p>
                  </div>
                ))}
                <div className="sm:col-span-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Confirmations</p>
                  <p className="text-xs text-emerald-100">
                    Use toasts with scope (team/user), optimistic updates, and rollback if Supabase returns an error.
                  </p>
                </div>
              </div>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection id="operations" title="Quality, Analytics & Launch">
            <SettingsCard
              title="Performance & Reliability"
              description="Set targets for load/render times, caching strategy, and optimistic updates."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {performanceTargets.map((target, idx) => (
                  <StatBadge
                    key={target.label}
                    label={target.label}
                    value={target.value}
                    tone={idx === 0 ? 'amber' : idx === 1 ? 'cyan' : 'emerald'}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Cache per-team settings, prefetch profile + team data, and retry Supabase writes with optimistic UI.
              </p>
            </SettingsCard>

            <SettingsCard
              title="Analytics Plan"
              description="Instrument key events (feature discovery, toggle changes, upsell interactions), define dashboards."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {analyticsPlan.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-800 bg-black/30 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-cyan-200" />
                      <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Ship a dashboard for upgrade funnel, save errors, and engagement by role (coach, coordinator, analyst).
              </p>
            </SettingsCard>

            <SettingsCard
              title="QA & Beta"
              description="Run usability tests with target customers, gather feedback, iterate; include visual QA checklist."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {qaPlan.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-800 bg-black/30 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.detail}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Beta with 5 teams, capture time-to-task, error frequency, and perception of premium value.
              </p>
            </SettingsCard>

            <SettingsCard
              title="Launch Readiness"
              description="Release notes, support playbook/FAQ, and in-app announcement cadence."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {launchChecklist.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-800 bg-black/30 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.detail}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Coordinate announcements with billing CTA visibility and plan badge placement above.
              </p>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection id="profile" title="Personal Profile">
            <SettingsCard
              title="Identity"
              description="Update how you appear to staff inside BlitzIQ Pro."
            >
              <form
                action={async (formData) => {
                  'use server'
                  await updateProfileIdentity(formData)
                  return
                }}
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
              description="Choose how BlitzIQ Pro keeps you informed."
            >
              <form
                action={async (formData) => {
                  'use server'
                  await updateNotificationPreferences(formData)
                  return
                }}
                className="space-y-4"
              >
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
                    <p>Google | Connected</p>
                    <p>Microsoft | Not linked</p>
                    <p>District SSO | Connected</p>
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
              <form
                action={async (formData) => {
                  'use server'
                  await updateTeamBranding(formData)
                  return
                }}
                className="space-y-4"
              >
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
              <form
                action={async (formData) => {
                  'use server'
                  await updateSeasonMetadata(formData)
                  return
                }}
                className="grid gap-4 md:grid-cols-2"
              >
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
                                    action={async (formData) => {
                                      'use server'
                                      await updateStaffRole(formData)
                                      return
                                    }}
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
                                  <form
                                    action={async (formData) => {
                                      'use server'
                                      await removeStaffMember(formData)
                                      return
                                    }}
                                  >
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
                                {formatRoleLabel(invite.role)} | Sent{' '}
                                {invite.created_at ? formatDate(invite.created_at) : 'Recently'}
                              </p>
                          </div>
                          <form
                            action={async (formData) => {
                              'use server'
                              await cancelStaffInvite(formData)
                              return
                            }}
                          >
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
                  action={async (formData) => {
                    'use server'
                    await inviteStaffMember(formData)
                    return
                  }}
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
                              {player.position || '--'}
                            </td>
                            <td className="px-4 py-3 text-slate-400">{player.unit || '--'}</td>
                            <td className="px-4 py-3 text-slate-400">
                              {player.class_year ?? '--'}
                            </td>
                            <td className="px-4 py-3">
                              <form
                                action={async (formData) => {
                                  'use server'
                                  await removeRosterPlayer(formData)
                                  return
                                }}
                              >
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
                  action={async (formData) => {
                    'use server'
                    await addRosterPlayer(formData)
                    return
                  }}
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
              <form
                action={async (formData) => {
                  'use server'
                  await savePositionGroups(formData)
                  return
                }}
                className="space-y-4"
              >
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
              <form
                action={async (formData) => {
                  'use server'
                  await saveDefaultChartTags(formData)
                  return
                }}
                className="space-y-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Personnel (Offense)
                      </p>
                      <span className="text-[0.65rem] text-slate-500">Comma or new line</span>
                    </div>
                    <textarea
                      name="personnel_offense"
                      defaultValue={personnelOffense.join(', ')}
                      className="min-h-[88px] w-full rounded-xl border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                    <p className="text-[0.75rem] text-slate-500">
                      Examples: 11, 12, 20, 21, 10
                    </p>
                  </label>
                  <label className="space-y-2 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Personnel (Defense)
                      </p>
                      <span className="text-[0.65rem] text-slate-500">Optional</span>
                    </div>
                    <textarea
                      name="personnel_defense"
                      defaultValue={personnelDefense.join(', ')}
                      placeholder="Base, Nickel, Dime"
                      className="min-h-[88px] w-full rounded-xl border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                    <p className="text-[0.75rem] text-slate-500">Helps defensive cut-ups.</p>
                  </label>
                  <label className="space-y-2 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Formations (Offense)
                      </p>
                      <span className="text-[0.65rem] text-slate-500">Comma or new line</span>
                    </div>
                    <textarea
                      name="formations_offense"
                      defaultValue={formationsOffense.join(', ')}
                      className="min-h-[88px] w-full rounded-xl border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                    <p className="text-[0.75rem] text-slate-500">
                      Examples: Trips Right, Trey Left, Bunch, Empty
                    </p>
                  </label>
                  <label className="space-y-2 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Formations (Defense)
                      </p>
                      <span className="text-[0.65rem] text-slate-500">Optional</span>
                    </div>
                    <textarea
                      name="formations_defense"
                      defaultValue={formationsDefense.join(', ')}
                      placeholder="Over, Under, Tite, Mint"
                      className="min-h-[88px] w-full rounded-xl border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                    <p className="text-[0.75rem] text-slate-500">Useful for defensive charting.</p>
                  </label>
                  <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Custom Tags
                      </p>
                      <span className="text-[0.65rem] text-slate-500">Optional</span>
                    </div>
                    <textarea
                      name="custom_tags"
                      defaultValue={customDefaults.join(', ')}
                      placeholder="Motions, pressures, game-plan specific tags"
                      className="min-h-[72px] w-full rounded-xl border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="submit"
                    name="mode"
                    value="restore"
                    className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 hover:border-slate-500 hover:text-slate-100 transition"
                  >
                    Restore defaults
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
                  >
                    Save tags
                  </button>
                </div>
              </form>

              <div className="border-t border-slate-900/60 pt-6 mt-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Explosive + Success Criteria
                    </p>
                    <p className="text-sm text-slate-400">
                      AI summaries and dashboards use these thresholds; they will not block data
                      entry.
                    </p>
                  </div>
                </div>
                <form
                  action={async (formData) => {
                    'use server'
                    await saveChartingThresholds(formData)
                    return
                  }}
                  className="grid gap-3 md:grid-cols-3"
                >
                  <label className="space-y-1 text-sm text-slate-300">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Explosive run (yds)
                    </span>
                    <input
                      type="number"
                      name="explosive_run_threshold"
                      min={0}
                      max={120}
                      defaultValue={chartingThresholds.explosiveRun}
                      className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-300">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Explosive pass (yds)
                    </span>
                    <input
                      type="number"
                      name="explosive_pass_threshold"
                      min={0}
                      max={120}
                      defaultValue={chartingThresholds.explosivePass}
                      className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                  <div className="space-y-1 text-sm text-slate-300">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Success (1st/2nd/3rd/4th)
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        type="number"
                        name="success_1st_yards"
                        min={0}
                        max={20}
                        defaultValue={chartingThresholds.success1st}
                        className="w-full rounded-lg border border-slate-800 bg-black/30 px-2 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                        placeholder="Yds"
                      />
                      <input
                        type="number"
                        name="success_2nd_pct"
                        min={0}
                        max={100}
                        defaultValue={chartingThresholds.success2nd}
                        className="w-full rounded-lg border border-slate-800 bg-black/30 px-2 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                        placeholder="%"
                      />
                      <input
                        type="number"
                        name="success_3rd_pct"
                        min={0}
                        max={100}
                        defaultValue={chartingThresholds.success3rd}
                        className="w-full rounded-lg border border-slate-800 bg-black/30 px-2 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                        placeholder="%"
                      />
                      <input
                        type="number"
                        name="success_4th_pct"
                        min={0}
                        max={100}
                        defaultValue={chartingThresholds.success4th}
                        className="w-full rounded-lg border border-slate-800 bg-black/30 px-2 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                        placeholder="%"
                      />
                    </div>
                    <p className="text-[0.75rem] text-slate-500">
                      Defaults: 4 yds, 70%, 60%, 60%
                    </p>
                  </div>
                  <div className="md:col-span-3 flex flex-wrap justify-end gap-2">
                    <button
                      type="submit"
                      name="mode"
                      value="restore"
                      className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 hover:border-slate-500 hover:text-slate-100 transition"
                    >
                      Restore defaults
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
                    >
                      Save thresholds
                    </button>
                  </div>
                </form>
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
              title="Premium Plan ($299/mo)"
              description="Pricing and plan visibility with a frictionless upgrade flow."
              actions={
                <button className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-black">
                  Upgrade to Premium
                </button>
              }
            >
              <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-200" />
                    <p className="text-sm font-semibold text-slate-100">
                      UI polish, power features, perfect UX
                    </p>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-400">
                    <li>Inline locks + previews in advanced controls to show value before paywall.</li>
                    <li>Plan badge visible in header and billing; guided upgrade CTA inside settings.</li>
                    <li>Priority support, audit visibility, and performance guarantees included.</li>
                  </ul>
                </div>
                <div className="space-y-3 rounded-2xl border border-slate-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Compare</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
                      <p className="text-sm font-semibold text-slate-100">Core</p>
                      <p className="text-slate-500">$0 / tenant</p>
                      <p className="mt-1 text-slate-500">Roster, basic settings, and exports.</p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
                      <p className="text-sm font-semibold text-emerald-100">Premium</p>
                      <p className="text-emerald-200">$299 / mo</p>
                      <p className="mt-1 text-emerald-100/80">Advanced controls, audit, priority support.</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    {'Upgrade flow: review -> confirm billing contact -> success toast + plan badge update.'}
                  </p>
                </div>
              </div>
            </SettingsCard>

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
                    <p className="font-semibold text-slate-100">Visa |||| 4242</p>
                    <p className="text-xs text-slate-500">Expires 04/27</p>
                    <button className="text-xs font-semibold text-brand">Update card</button>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-black/30 p-4 space-y-3 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Contacts</p>
                    {billingContacts.map((contact) => (
                      <div key={contact.email}>
                        <p className="font-semibold text-slate-100">{contact.name}</p>
                        <p className="text-xs text-slate-500">
                          {contact.email} | {contact.role}
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
              title="Security & Trust Story"
              description="Highlight roles/permissions, MFA prompts, activity logs, and data residency controls."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-black/30 p-3">
                  <p className="text-sm font-semibold text-slate-100">Governance</p>
                  <ul className="mt-2 space-y-2 text-xs text-slate-400">
                    <li>Roles + permissions surfaced beside staff table and invites with edit protections.</li>
                    <li>Activity log snippet inline with link to full audit history.</li>
                    <li>Data residency and compliance note near billing and API keys.</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-black/30 p-3">
                  <p className="text-sm font-semibold text-slate-100">MFA & API hygiene</p>
                  <ul className="mt-2 space-y-2 text-xs text-slate-400">
                    <li>MFA prompt CTA plus enforcement toggle for tenant owners.</li>
                    <li>Scoped API keys with last-used visibility and revoke actions.</li>
                    <li>Audit and alerting for billing changes and roster imports.</li>
                  </ul>
                </div>
              </div>
            </SettingsCard>

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
                        {key.scope} | Last used {key.lastUsed}
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
                      {entry.actor} | {entry.timestamp}
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
    <GlassCard className="space-y-4" padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          {description && <p className="text-sm text-slate-400">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </GlassCard>
  )
}


