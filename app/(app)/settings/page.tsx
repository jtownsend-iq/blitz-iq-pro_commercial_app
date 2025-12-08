import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, Flame, LayoutGrid, Palette, ShieldCheck, Sparkles, Upload, Wand2 } from 'lucide-react'
import { requireAuth } from '@/utils/auth/requireAuth'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { CTAButton } from '@/components/ui/CTAButton'
import {
  updateProfileIdentity,
  updateTeamBranding,
  updateSeasonMetadata,
  updateTeamPreferences,
  saveChartingThresholds,
  saveDictionaryItems,
  saveIntegrationMappings,
  updateStaffRole,
} from './actions'
import { DEFAULT_EXPLOSIVE_THRESHOLDS, DEFAULT_SUCCESS_THRESHOLDS, DICTIONARY_CATEGORIES } from './constants'
import { loadDataDictionaries, loadTeamPreferences, loadTeamSeasonContext, type DictionaryItem } from '@/lib/preferences'

type ProfileRow = {
  full_name: string | null
  title: string | null
  phone_number: string | null
  active_team_id: string | null
}

type TeamRow = {
  id: string
  name: string | null
  level: string | null
  school_name: string | null
  primary_color?: string | null
  logo_url?: string | null
}

type StaffMemberRow = {
  user_id: string
  role: string | null
  users: {
    full_name: string | null
    email: string | null
  } | null
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createSupabaseServerClient()
  const { user, activeTeamId } = await requireAuth()
  const params = await searchParams
  const surfaceParam = typeof params.surface === 'string' ? params.surface.toLowerCase() : 'quick'
  const surface: 'quick' | 'advanced' = surfaceParam === 'advanced' ? 'advanced' : 'quick'

  if (!activeTeamId) {
    redirect('/onboarding/team')
  }

  const selectColumns = ['full_name', 'title', 'phone_number', 'active_team_id'].join(', ')
  const { data: profileData } = await supabase
    .from('users')
    .select(selectColumns)
    .eq('id', user.id)
    .maybeSingle()

  const profile = (profileData as ProfileRow | null) ?? null

  const { data: teamData } = await supabase
    .from('teams')
    .select('id, name, level, school_name, primary_color, logo_url')
    .eq('id', activeTeamId)
    .maybeSingle()

  const activeTeam = teamData as TeamRow | null
  if (!activeTeam) {
    redirect('/onboarding/team')
  }

  const { data: membershipData } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', activeTeamId)
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: staffData } = await supabase
    .from('team_members')
    .select('user_id, role, users:users(full_name, email)')
    .eq('team_id', activeTeamId)
    .order('role', { ascending: true })

  const staff = (staffData as StaffMemberRow[] | null) ?? []

  const seasonContext = await loadTeamSeasonContext(supabase, activeTeamId)
  const preferences = await loadTeamPreferences(supabase, activeTeamId)
  const dictionaries = await loadDataDictionaries(supabase, activeTeamId)

  const headerSeasonLabel =
    seasonContext.seasonLabel || (seasonContext.seasonYear ? seasonContext.seasonYear.toString() : 'Season')

  const roleLabel = formatRoleLabel(membershipData?.role || 'Coach')

  return (
    <section className="space-y-8">
      <GlassCard className="overflow-hidden border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionHeader
            eyebrow="Settings"
            title="Team settings and preferences"
            description="Quick changes for coaches, deeper configuration for analysts. Everything stays scoped to the active team."
            actions={
              <div className="flex flex-wrap gap-2 text-xs text-slate-200">
                <Pill label={activeTeam?.name || 'Team'} tone="cyan" icon={<LayoutGrid className="h-3 w-3" />} />
                <Pill label={headerSeasonLabel} tone="emerald" icon={<ShieldCheck className="h-3 w-3" />} />
                <Pill label={roleLabel} tone="slate" icon={<Sparkles className="h-3 w-3" />} />
              </div>
            }
          />
        </div>
      </GlassCard>
      <div className="flex items-center gap-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">
        <TabLink href="/settings?surface=quick" active={surface === 'quick'}>
          Quick settings
        </TabLink>
        <TabLink href="/settings?surface=advanced" active={surface === 'advanced'}>
          Advanced settings
        </TabLink>
      </div>

      {surface === 'quick' ? (
        <QuickSettingsView
          activeTeam={activeTeam}
          preferences={preferences}
          seasonLabel={headerSeasonLabel}
          seasonYear={seasonContext.seasonYear ?? new Date().getFullYear()}
        />
      ) : (
        <AdvancedSettingsView
          activeTeam={activeTeam}
          preferences={preferences}
          dictionaries={dictionaries}
          staff={staff}
          roleLabel={roleLabel}
          seasonLabel={headerSeasonLabel}
          profile={profile}
        />
      )}
    </section>
  )
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 border transition ${
        active
          ? 'border-brand bg-brand/20 text-white shadow-[0_12px_30px_-20px_rgba(0,229,255,0.7)]'
          : 'border-white/10 bg-white/5 hover:border-brand hover:text-white'
      }`}
    >
      {children}
    </Link>
  )
}

function QuickSettingsView({
  activeTeam,
  preferences,
  seasonLabel,
  seasonYear,
}: {
  activeTeam: TeamRow
  preferences: Awaited<ReturnType<typeof loadTeamPreferences>>
  seasonLabel: string
  seasonYear: number
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
      <div className="space-y-6">
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.75rem] uppercase tracking-[0.2em] text-slate-500">Identity</p>
              <h3 className="text-lg font-semibold text-slate-50">Team name, logo, and colors</h3>
              <p className="text-sm text-slate-400">
                Coaches should recognize this instantly. Changes apply across dashboards, games, and scouting.
              </p>
            </div>
            <Palette className="h-5 w-5 text-cyan-300" />
          </div>
          <form
            action={async (formData) => {
              'use server'
              await updateTeamBranding(formData)
            }}
            className="grid gap-3 md:grid-cols-2"
          >
            <input type="hidden" name="team_id" value={activeTeam.id} />
            <Input label="Team name" name="team_name" defaultValue={activeTeam.name ?? ''} required />
            <Input label="School / program" name="school_name" defaultValue={activeTeam.school_name ?? ''} />
            <Input label="Level" name="team_level" defaultValue={activeTeam.level ?? ''} placeholder="Varsity, FBS, etc." />
            <Input label="Primary color" name="primary_color" defaultValue={activeTeam.primary_color ?? '#0EA5E9'} placeholder="#0EA5E9" />
            <Input label="Logo URL" name="logo_url" defaultValue={activeTeam.logo_url ?? ''} placeholder="https://cdn..." />
            <div className="md:col-span-2 flex justify-end">
              <CTAButton type="submit" variant="primary" size="sm">
                Save identity
              </CTAButton>
            </div>
          </form>
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.75rem] uppercase tracking-[0.2em] text-slate-500">Season</p>
              <h3 className="text-lg font-semibold text-slate-50">Current season context</h3>
              <p className="text-sm text-slate-400">
                The season label shows in the app shell and anchors analytics and scouting filters.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
          </div>
          <form
            action={async (formData) => {
              'use server'
              await updateSeasonMetadata(formData)
            }}
            className="grid gap-3 md:grid-cols-3"
          >
            <Input label="Season year" name="season_year" type="number" defaultValue={seasonYear} required />
            <Input label="Season label" name="season_label" placeholder="2025 Regular" defaultValue={seasonLabel} />
            <div className="md:col-span-3 flex justify-end">
              <CTAButton type="submit" variant="primary" size="sm">
                Save season
              </CTAButton>
            </div>
          </form>
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.75rem] uppercase tracking-[0.2em] text-slate-500">Quick preferences</p>
              <h3 className="text-lg font-semibold text-slate-50">Base structures and thresholds</h3>
              <p className="text-sm text-slate-400">
                Set defaults coordinators see first. Offensive/defensive structures and explosive thresholds feed the stats engine.
              </p>
            </div>
            <Flame className="h-5 w-5 text-amber-300" />
          </div>
          <form
            action={async (formData) => {
              'use server'
              await updateTeamPreferences(formData)
            }}
            className="grid gap-3 md:grid-cols-2"
          >
            <TextArea
              label="Base offensive personnel"
              name="base_off_personnel"
              defaultValue={preferences.baseOffPersonnel.join('\\n')}
              helper="One per line (e.g., 11, 12, 20)"
            />
            <TextArea
              label="Base offensive formations"
              name="base_off_formations"
              defaultValue={preferences.baseOffFormations.join('\\n')}
              helper="One per line"
            />
            <TextArea
              label="Base defensive fronts"
              name="base_def_fronts"
              defaultValue={preferences.baseDefFronts.join('\\n')}
              helper="One per line"
            />
            <TextArea
              label="Base coverages"
              name="base_coverages"
              defaultValue={preferences.baseCoverages.join('\\n')}
              helper="One per line"
            />
            <TextArea
              label="Special teams formations"
              name="base_special_formations"
              defaultValue={preferences.baseSpecialFormations.join('\\n')}
              helper="Punt shield, KO Left, etc."
            />
            <TextArea
              label="Special teams calls"
              name="base_special_calls"
              defaultValue={preferences.baseSpecialCalls.join('\\n')}
              helper="Sky kick, onside alert, fake punt"
            />
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 md:col-span-2">
              <input
                type="checkbox"
                name="include_turnover_on_downs"
                defaultChecked={preferences.analytics.includeTurnoverOnDowns}
                className="h-4 w-4 rounded border-slate-700 bg-black/40 text-brand focus:ring-brand/40"
              />
              <div className="text-sm text-slate-200">
                Count turnovers on downs in margin
                <p className="text-xs text-slate-400">
                  Toggled off for staffs that separate failed fourth-downs from takeaways.
                </p>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-3 md:col-span-2">
              <Input
                label="AI suggestion aggressiveness (0-100)"
                name="ai_suggestion_aggressiveness"
                type="number"
                min={0}
                max={100}
                defaultValue={preferences.aiSuggestionAggressiveness}
              />
              <label className="space-y-1 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Stats panel density</span>
                <select
                  name="stats_panel_density"
                  defaultValue={preferences.statsPanelDensity}
                  className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                >
                  <option value="compact">Compact</option>
                  <option value="balanced">Balanced</option>
                  <option value="dense">Dense</option>
                </select>
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <input
                  type="checkbox"
                  name="use_custom_explosives"
                  defaultChecked={preferences.useCustomExplosives}
                  className="h-4 w-4 rounded border-slate-700 bg-black/40 text-brand focus:ring-brand/40"
                />
                <div className="text-sm text-slate-200">
                  Use custom explosive thresholds
                  <p className="text-xs text-slate-400">When unchecked, defaults reset to {DEFAULT_EXPLOSIVE_THRESHOLDS.run}/{DEFAULT_EXPLOSIVE_THRESHOLDS.pass}.</p>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <CTAButton type="submit" variant="primary" size="sm">
                Save quick preferences
              </CTAButton>
            </div>
          </form>

          <form
            action={async (formData) => {
              'use server'
              await saveChartingThresholds(formData)
            }}
            className="grid gap-3 md:grid-cols-2 rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div>
              <p className="text-sm font-semibold text-slate-100">Explosive thresholds</p>
              <p className="text-xs text-slate-400">
                Feeds the stats engine immediately; dashboards and analytics will refresh with the new thresholds.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Explosive run (yards)"
                name="explosive_run_threshold"
                type="number"
                defaultValue={preferences.analytics.explosiveRun}
              />
              <Input
                label="Explosive pass (yards)"
                name="explosive_pass_threshold"
                type="number"
                defaultValue={preferences.analytics.explosivePass}
              />
              <Input
                label="1st down success yards"
                name="success_1st_yards"
                type="number"
                defaultValue={DEFAULT_SUCCESS_THRESHOLDS.firstDownYards}
              />
              <Input
                label="2nd down success %"
                name="success_2nd_pct"
                type="number"
                defaultValue={DEFAULT_SUCCESS_THRESHOLDS.secondDownPct}
              />
              <Input label="3rd down success %" name="success_3rd_pct" type="number" defaultValue={DEFAULT_SUCCESS_THRESHOLDS.thirdDownPct} />
              <Input label="4th down success %" name="success_4th_pct" type="number" defaultValue={DEFAULT_SUCCESS_THRESHOLDS.fourthDownPct} />
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center gap-2">
              <CTAButton type="submit" variant="primary" size="sm">
                Save thresholds
              </CTAButton>
              <button
                type="submit"
                name="mode"
                value="restore"
                className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 hover:border-brand"
              >
                Restore defaults
              </button>
              <span className="text-xs text-slate-400">
                Defaults: run {DEFAULT_EXPLOSIVE_THRESHOLDS.run}yd, pass {DEFAULT_EXPLOSIVE_THRESHOLDS.pass}yd.
              </span>
            </div>
          </form>
        </GlassCard>
      </div>

      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.75rem] uppercase tracking-[0.2em] text-slate-500">Guided tips</p>
            <h3 className="text-lg font-semibold text-slate-50">What changes right away</h3>
          </div>
          <Wand2 className="h-5 w-5 text-emerald-300" />
        </div>
        <ul className="space-y-3 text-sm text-slate-200">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5" />
            Team identity and season label render in the app shell header so every coordinator knows which context is active.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5" />
            Explosive thresholds and turnover-on-downs preferences flow into dashboards, analytics, and live charting immediately.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5" />
            Base personnel, formations, and calls pre-fill dropdowns in charting so analysts stay on the same language.
          </li>
        </ul>
      </GlassCard>
    </div>
  )
}

function AdvancedSettingsView({
  activeTeam,
  preferences,
  dictionaries,
  staff,
  roleLabel,
  seasonLabel,
  profile,
}: {
  activeTeam: TeamRow
  preferences: Awaited<ReturnType<typeof loadTeamPreferences>>
  dictionaries: DictionaryItem[]
  staff: StaffMemberRow[]
  roleLabel: string
  seasonLabel: string
  profile: ProfileRow | null
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[260px,1fr]">
      <aside className="hidden lg:block">
        <GlassCard padding="none" className="sticky top-6">
          <nav className="p-4 space-y-1 text-sm text-slate-300">
            <NavLink href="#general">General</NavLink>
            <NavLink href="#unit-defaults">Unit defaults</NavLink>
            <NavLink href="#dictionaries">Data dictionaries</NavLink>
            <NavLink href="#roles">Roles & access</NavLink>
            <NavLink href="#preferences">Game preferences</NavLink>
            <NavLink href="#integrations">Integrations</NavLink>
          </nav>
        </GlassCard>
      </aside>

      <div className="space-y-10">
        <SettingsSection id="general" title="General">
          <SettingsCard
            title="Team identity"
            description="Polished identity for multi-tenant staffs. Matches the shell header and cards."
            actions={<Pill label={seasonLabel} tone="emerald" icon={<ShieldCheck className="h-3 w-3" />} />}
          >
            <form
              action={async (formData) => {
                'use server'
                await updateTeamBranding(formData)
              }}
              className="grid gap-3 md:grid-cols-3"
            >
              <Input label="Team name" name="team_name" defaultValue={activeTeam.name ?? ''} required />
              <Input label="School / program" name="school_name" defaultValue={activeTeam.school_name ?? ''} />
              <Input label="Level" name="team_level" defaultValue={activeTeam.level ?? ''} />
              <Input label="Primary color" name="primary_color" defaultValue={activeTeam.primary_color ?? '#0EA5E9'} />
              <Input label="Logo URL" name="logo_url" defaultValue={activeTeam.logo_url ?? ''} />
              <div className="md:col-span-3 flex justify-end">
                <CTAButton type="submit" variant="primary" size="sm">
                  Save identity
                </CTAButton>
              </div>
            </form>
          </SettingsCard>

          <SettingsCard
            title="Profile"
            description="Your name and title show up on reports and permissions lists."
            actions={<Pill label={roleLabel} tone="slate" icon={<Sparkles className="h-3 w-3" />} />}
          >
            <form
              action={async (formData) => {
                'use server'
                await updateProfileIdentity(formData)
              }}
              className="grid gap-3 md:grid-cols-3"
            >
              <Input label="Full name" name="full_name" defaultValue={profile?.full_name ?? ''} required />
              <Input label="Title" name="title" defaultValue={profile?.title ?? ''} />
              <Input label="Mobile" name="phone_number" defaultValue={profile?.phone_number ?? ''} />
              <div className="md:col-span-3 flex justify-end">
                <CTAButton type="submit" variant="secondary" size="sm">
                  Save profile
                </CTAButton>
              </div>
            </form>
          </SettingsCard>
        </SettingsSection>

        <SettingsSection id="unit-defaults" title="Unit defaults">
          <SettingsCard
            title="Offense, defense, special teams defaults"
            description="These defaults seed dropdowns, quick-picks, and AI prompts so the staff speaks the same language."
          >
            <form
              action={async (formData) => {
                'use server'
                await updateTeamPreferences(formData)
              }}
              className="grid gap-3 md:grid-cols-2"
            >
              <TextArea label="Offensive personnel" name="base_off_personnel" defaultValue={preferences.baseOffPersonnel.join('\n')} helper="One per line" />
              <TextArea label="Offensive formations" name="base_off_formations" defaultValue={preferences.baseOffFormations.join('\n')} helper="One per line" />
              <TextArea label="Defensive fronts" name="base_def_fronts" defaultValue={preferences.baseDefFronts.join('\n')} helper="One per line" />
              <TextArea label="Coverages" name="base_coverages" defaultValue={preferences.baseCoverages.join('\n')} helper="One per line" />
              <TextArea label="Special teams formations" name="base_special_formations" defaultValue={preferences.baseSpecialFormations.join('\n')} helper="Punt shield, KO L/R, PAT/FG" />
              <TextArea label="Special teams calls" name="base_special_calls" defaultValue={preferences.baseSpecialCalls.join('\n')} helper="Sky kick, fake punt, onside alert" />
              <div className="md:col-span-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <input
                  type="checkbox"
                  name="include_turnover_on_downs"
                  defaultChecked={preferences.analytics.includeTurnoverOnDowns}
                  className="h-4 w-4 rounded border-slate-700 bg-black/40 text-brand focus:ring-brand/40"
                />
                <div className="text-sm text-slate-200">
                  Count turnover on downs in turnover margin
                  <p className="text-xs text-slate-400">
                    If unchecked, turnover margin excludes failed fourth downs across analytics and dashboards.
                  </p>
                </div>
              </div>
              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <label className="text-sm text-slate-300">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">AI suggestion aggressiveness</span>
                  <input
                    type="number"
                    name="ai_suggestion_aggressiveness"
                    min={0}
                    max={100}
                    defaultValue={preferences.aiSuggestionAggressiveness}
                    className="mt-1 w-28 rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                  />
                </label>
                <label className="text-sm text-slate-300">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Stats panel density</span>
                  <select
                    name="stats_panel_density"
                    defaultValue={preferences.statsPanelDensity}
                    className="mt-1 w-44 rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                  >
                    <option value="compact">Compact</option>
                    <option value="balanced">Balanced</option>
                    <option value="dense">Dense</option>
                  </select>
                </label>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    name="use_custom_explosives"
                    defaultChecked={preferences.useCustomExplosives}
                    className="h-4 w-4 rounded border-slate-700 bg-black/40 text-brand focus:ring-brand/40"
                  />
                  Use custom explosive thresholds
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <CTAButton type="submit" variant="primary" size="sm">
                  Save unit defaults
                </CTAButton>
                <button
                  type="submit"
                  name="mode"
                  value="restore"
                  className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 hover:border-brand"
                >
                  Restore defaults
                </button>
              </div>
            </form>
          </SettingsCard>
        </SettingsSection>

        <SettingsSection id="dictionaries" title="Data dictionaries">
          <SettingsCard
            title="Controlled vocabularies"
            description="Manage formations, personnel codes, concepts, and special teams categories. Items can be deprecated—not deleted—so historical data stays intact."
          >
            <form
              action={async (formData) => {
                'use server'
                await saveDictionaryItems(formData)
              }}
              className="space-y-4"
            >
              {DICTIONARY_CATEGORIES.map((category) => {
                const items = dictionaries.filter((d) => d.category === category.id)
                return (
                  <div key={category.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{category.label}</p>
                        <p className="text-xs text-slate-400">Searchable in charting and scouting. Deprecated items stay for history.</p>
                      </div>
                      <Pill label={`${items.length} items`} tone="slate" />
                    </div>
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="grid gap-2 md:grid-cols-[1.2fr,1fr,120px,120px,120px]"
                        >
                          <input type="hidden" name="dict_category" value={category.id} />
                          <Input name="dict_label" defaultValue={item.label} required />
                          <Input name="dict_code" defaultValue={item.code ?? ''} placeholder="Code / alias" />
                          <select
                            name="dict_status"
                            defaultValue={item.status}
                            className="rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                          >
                            <option value="active">Active</option>
                            <option value="deprecated">Deprecated</option>
                          </select>
                          <Input name="dict_sort" defaultValue={item.sort_order ?? idx} type="number" />
                          <Input name="dict_season" defaultValue={item.season_year ?? ''} placeholder="Season" />
                          <Input name="dict_description" defaultValue={item.description ?? ''} placeholder="Notes" />
                        </div>
                      ))}
                      <div className="grid gap-2 md:grid-cols-[1.2fr,1fr,120px,120px,120px]" aria-label="Add new dictionary item">
                        <input type="hidden" name="dict_category" value={category.id} />
                        <Input name="dict_label" placeholder="New label" />
                        <Input name="dict_code" placeholder="Code / alias" />
                        <select
                          name="dict_status"
                          defaultValue="active"
                          className="rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                        >
                          <option value="active">Active</option>
                          <option value="deprecated">Deprecated</option>
                        </select>
                        <Input name="dict_sort" type="number" defaultValue={items.length} />
                        <Input name="dict_season" placeholder="Season" />
                        <Input name="dict_description" placeholder="Notes" />
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="flex justify-end">
                <CTAButton type="submit" variant="primary" size="sm">
                  Save data dictionaries
                </CTAButton>
              </div>
            </form>
          </SettingsCard>
        </SettingsSection>

        <SettingsSection id="roles" title="Roles & access">
          <SettingsCard
            title="Staff roles and default navigation"
            description="Roles drive where staff land by default. Coordinators hit their unit workspace; analysts land in games or scouting."
          >
            <div className="space-y-3">
              {staff.map((member) => (
                <div
                  key={member.user_id}
                  className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{member.users?.full_name || 'Staff member'}</p>
                    <p className="text-xs text-slate-400">{member.users?.email || 'Email unknown'}</p>
                  </div>
                  <form
                    action={async (formData) => {
                      'use server'
                      await updateStaffRole(formData)
                    }}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="member_user_id" value={member.user_id} />
                    <select
                      name="role"
                      defaultValue={member.role ?? ''}
                      className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    >
                      <option value="HEAD_COACH">Head Coach</option>
                      <option value="COORDINATOR">Coordinator</option>
                      <option value="POSITION_COACH">Position Coach</option>
                      <option value="ANALYST">Analyst</option>
                      <option value="ADMIN">Program Admin</option>
                      <option value="IT_ADMIN">IT / Ops</option>
                    </select>
                    <CTAButton type="submit" variant="secondary" size="sm">
                      Update
                    </CTAButton>
                  </form>
                </div>
              ))}
              {staff.length === 0 ? (
                <p className="text-sm text-slate-400">No staff members yet—invite them from the Team workspace.</p>
              ) : null}
            </div>
          </SettingsCard>
        </SettingsSection>

        <SettingsSection id="preferences" title="Game preferences">
          <SettingsCard
            title="Turnovers, AI suggestions, density"
            description="Preferences immediately change dashboards, analytics, and live charting behavior."
          >
            <form
              action={async (formData) => {
                'use server'
                await updateTeamPreferences(formData)
              }}
              className="grid gap-3 md:grid-cols-2"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 md:col-span-2">
                <input
                  type="checkbox"
                  name="include_turnover_on_downs"
                  defaultChecked={preferences.analytics.includeTurnoverOnDowns}
                  className="h-4 w-4 rounded border-slate-700 bg-black/40 text-brand focus:ring-brand/40"
                />
                <div className="text-sm text-slate-200">
                  Count turnover on downs in turnover margin
                  <p className="text-xs text-slate-400">
                    When off, turnover margin and per-game turnovers exclude failed fourth downs.
                  </p>
                </div>
              </div>
              <Input
                label="AI suggestion aggressiveness (0-100)"
                name="ai_suggestion_aggressiveness"
                type="number"
                min={0}
                max={100}
                defaultValue={preferences.aiSuggestionAggressiveness}
              />
              <label className="space-y-1 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Stats panel density</span>
                <select
                  name="stats_panel_density"
                  defaultValue={preferences.statsPanelDensity}
                  className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                >
                  <option value="compact">Compact</option>
                  <option value="balanced">Balanced</option>
                  <option value="dense">Dense</option>
                </select>
              </label>
              <div className="md:col-span-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <input
                  type="checkbox"
                  name="use_custom_explosives"
                  defaultChecked={preferences.useCustomExplosives}
                  className="h-4 w-4 rounded border-slate-700 bg-black/40 text-brand focus:ring-brand/40"
                />
                <div className="text-sm text-slate-200">
                  Keep custom explosive thresholds
                  <p className="text-xs text-slate-400">
                    If unchecked, thresholds revert to defaults and analytics update instantly.
                  </p>
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <CTAButton type="submit" variant="primary" size="sm">
                  Save game preferences
                </CTAButton>
              </div>
            </form>
          </SettingsCard>
        </SettingsSection>

        <SettingsSection id="integrations" title="Integrations">
          <SettingsCard
            title="HUDL + CSV mapping"
            description="Map external column names to internal fields with validation. Deprecated items stay visible for historical files."
            actions={<Pill label="Mapping" tone="cyan" icon={<Upload className="h-3 w-3" />} />}
          >
            <form
              action={async (formData) => {
                'use server'
                await saveIntegrationMappings(formData)
              }}
              className="grid gap-4 md:grid-cols-2"
            >
              <TextArea
                label="HUDL mapping (external:internal per line or JSON)"
                name="hudl_mapping_text"
                placeholder="OForm: offensive_formation_id"
              />
              <TextArea
                label="CSV mapping (external:internal per line or JSON)"
                name="csv_mapping_text"
                placeholder="Gain: gained_yards"
              />
              <TextArea
                label="HUDL mapping JSON (optional)"
                name="hudl_mapping_json"
                placeholder='{"OForm":"offensive_formation_id"}'
              />
              <TextArea
                label="CSV mapping JSON (optional)"
                name="csv_mapping_json"
                placeholder='{"Gain":"gained_yards"}'
              />
              <div className="md:col-span-2 flex justify-end gap-2">
                <CTAButton type="submit" variant="primary" size="sm">
                  Save mappings
                </CTAButton>
              </div>
            </form>
          </SettingsCard>
        </SettingsSection>
      </div>
    </div>
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

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="block rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-slate-50 transition"
    >
      {children}
    </a>
  )
}

function Input({
  label,
  helper,
  name,
  type = 'text',
  defaultValue,
  required,
  placeholder,
}: {
  label?: string
  helper?: string
  name: string
  type?: string
  defaultValue?: string | number
  required?: boolean
  placeholder?: string
}) {
  return (
    <label className="space-y-1 text-sm text-slate-300">
      {label ? <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</span> : null}
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </label>
  )
}

function TextArea({
  label,
  helper,
  name,
  defaultValue,
  placeholder,
}: {
  label?: string
  helper?: string
  name: string
  defaultValue?: string
  placeholder?: string
}) {
  return (
    <label className="space-y-1 text-sm text-slate-300">
      {label ? <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</span> : null}
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </label>
  )
}

function formatRoleLabel(role: string | null) {
  if (!role) return 'Coach'
  const normalized = role.replace(/_/g, ' ').toLowerCase()
  return normalized
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
