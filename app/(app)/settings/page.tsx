import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { LayoutDashboard, ShieldCheck } from 'lucide-react'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import {
  updateNotificationPreferences,
  updateProfileIdentity,
} from './actions'
import { notificationToggleFields, type NotificationToggleKey } from './constants'

const navItems = [
  { id: 'profile', label: 'Profile' },
  { id: 'billing', label: 'Billing' },
  { id: 'security', label: 'Security' },
]

const notificationRows = [
  {
    id: 'ai',
    label: 'AI suggestions',
    description: 'Live prompts during games.',
    keys: {
      email: 'notify_ai_email',
      sms: 'notify_ai_sms',
      push: 'notify_ai_push',
    },
  },
  {
    id: 'reports',
    label: 'Post-game reports',
    description: 'PDFs and data exports.',
    keys: {
      email: 'notify_reports_email',
      sms: 'notify_reports_sms',
      push: 'notify_reports_push',
    },
  },
  {
    id: 'billing',
    label: 'Billing alerts',
    description: 'Invoices and renewal reminders.',
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

type ProfileRow = {
  full_name: string | null
  title: string | null
  phone_number: string | null
  active_team_id: string | null
} & Partial<Record<NotificationToggleKey, boolean | null>>

type TeamBrandingRow = {
  id: string
  name: string | null
  level: string | null
}

type TeamSettingsRow = {
  default_season_year: number | null
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const _searchParams = await searchParams
  void _searchParams
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
    } = await supabase.from('teams').select('id, name, level').eq('id', activeTeamId).maybeSingle()

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

  const formatRoleLabel = (role: string | null) => {
    if (!role) return 'Coach'
    const normalized = role.replace(/_/g, ' ').toLowerCase()
    return normalized
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const planLabel = 'Current plan'
  const currentPlanName = 'Premium'
  const currentPlanPrice = '$299/mo'
  const renewalText = 'Renews monthly unless changed in billing.'

  return (
    <section className="space-y-10">
      <SectionHeader
        eyebrow="Settings"
        title="Account, billing, and security"
        description="Update your profile, billing details, and account security for BlitzIQ Pro."
        actions={
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            <Pill label={activeTeamName} tone="cyan" icon={<LayoutDashboard className="h-3 w-3" />} />
            <Pill label={formatRoleLabel(activeTeamRole)} tone="emerald" icon={<ShieldCheck className="h-3 w-3" />} />
          </div>
        }
      />

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">{activeTeamName}</p>
            <p className="text-xs text-slate-400">
              {teamBrandingRow?.level || 'Team level not set'} · Season {seasonLabel || seasonYear}
            </p>
            <p className="text-xs text-slate-500">Signed in as {profileDisplayName}</p>
          </div>
          <a
            href="/team"
            className="rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
          >
            Manage team, roster, and staff
          </a>
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

        <div className="space-y-12">
          <SettingsSection id="profile" title="Profile">
            <SettingsCard
              title="Your details"
              description="Update how your name shows up on reports and messages."
            >
              <form
                action={async (formData) => {
                  'use server'
                  const result = await updateProfileIdentity(formData)
                  if (!result || (typeof result === 'object' && 'error' in result && result.error)) {
                    console.error('Profile update failed')
                  }
                  return
                }}
                className="grid gap-4 md:grid-cols-3"
              >
                <label className="space-y-1 text-sm text-slate-300 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Full name</span>
                  <input
                    type="text"
                    name="full_name"
                    defaultValue={profileFullName}
                    required
                    placeholder="Name for reports"
                    className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                  />
                </label>
                <label className="space-y-1 text-sm text-slate-300">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Title</span>
                  <input
                    type="text"
                    name="title"
                    defaultValue={profileTitle}
                    placeholder="Head Coach, OC, DC"
                    className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                  />
                </label>
                <label className="space-y-1 text-sm text-slate-300">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Mobile</span>
                  <input
                    type="tel"
                    name="phone_number"
                    defaultValue={profilePhone}
                    placeholder="For alerts and calls"
                    className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                  />
                </label>
                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
                  >
                    Save profile
                  </button>
                </div>
              </form>
            </SettingsCard>

            <SettingsCard
              title="Notifications"
              description="Pick how you’d like to hear from us. You can change this anytime."
            >
              <form
                action={async (formData) => {
                  'use server'
                  const result = await updateNotificationPreferences(formData)
                  if (!result || (typeof result === 'object' && 'error' in result && result.error)) {
                    console.error('Notifications update failed')
                  }
                  return
                }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  {notificationRows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-2xl border border-slate-800 bg-black/30 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{row.label}</p>
                          <p className="text-xs text-slate-500">{row.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                        {(['email', 'sms', 'push'] as const).map((channel) => {
                          const key = row.keys[channel]
                          return (
                            <label
                              key={channel}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/20 px-3 py-1.5"
                            >
                              <input
                                type="checkbox"
                                name={key}
                                defaultChecked={notificationDefaults[key]}
                                className="h-4 w-4 rounded border-slate-700 bg-black/50 text-brand focus:ring-brand/40"
                              />
                              <span className="capitalize">{channel}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
                  >
                    Save notifications
                  </button>
                </div>
              </form>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection id="billing" title="Billing">
            <SettingsCard
              title="Plan"
              description="Your billing is handled through Stripe. You can update it anytime."
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">{planLabel}</p>
                  <p className="text-lg font-semibold text-slate-50">
                    {currentPlanName} — {currentPlanPrice}
                  </p>
                  <p className="text-xs text-slate-500">{renewalText}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/billing"
                    className="rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
                  >
                    Manage billing
                  </a>
                  <a
                    href="/contact"
                    className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-slate-500"
                  >
                    Talk to sales about Elite
                  </a>
                </div>
              </div>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection id="security" title="Security & access">
            <SettingsCard
              title="Keep your account secure"
              description="Update your password or sign out of devices you no longer use."
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 text-sm text-slate-300">
                  <p>Use a strong password and enable multi-factor authentication if available.</p>
                  <p className="text-xs text-slate-500">
                    If you suspect unusual activity, sign out and reset your password from the login screen.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <a
                    href="/login?reset=true"
                    className="rounded-full border border-slate-700 px-4 py-2 font-semibold uppercase tracking-[0.18em] text-slate-200 hover:border-slate-500"
                  >
                    Change password
                  </a>
                  <a
                    href="/login?signout=true"
                    className="rounded-full bg-slate-100 px-4 py-2 font-semibold uppercase tracking-[0.18em] text-slate-900"
                  >
                    Sign out
                  </a>
                </div>
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
