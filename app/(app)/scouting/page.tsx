import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import {
  BarChart3,
  CheckCircle2,
  Crosshair,
  Gauge,
  Lock,
  Rocket,
  Shield,
  ShieldAlert,
  Sparkles,
  Smartphone,
} from 'lucide-react'
import ScoutingBoard from '@/components/scout/ScoutingBoard'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { CTAButton } from '@/components/ui/CTAButton'
import { TrackedCTAButton } from '@/components/ui/TrackedCTAButton'
import { ScoutingNav } from '@/components/scout/ScoutingNav'
import { StatBadge } from '@/components/ui/StatBadge'

const navItems = [
  { id: 'premium', label: 'Premium Goals' },
  { id: 'experience', label: 'Experience & IA' },
  { id: 'data', label: 'Data & Controls' },
  { id: 'ai', label: 'AI & Education' },
  { id: 'security', label: 'Trust & Upsell' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'qa', label: 'QA & Launch' },
  { id: 'workspace', label: 'Scouting Workspace' },
]

const personaGoals = [
  {
    persona: 'Head Coach',
    goal: 'Confidently approve plans and live calls',
    measure: 'Upgrade intent and adoption of AI recs',
  },
  {
    persona: 'OC/DC',
    goal: 'Edit tendencies and tags in under 2 steps',
    measure: 'Task completion under 2 steps per edit',
  },
  {
    persona: 'Analyst',
    goal: 'Import, clean, and export without errors',
    measure: 'Bug rate and export success per import',
  },
]

const valuePillars = [
  {
    label: 'UI polish',
    detail: 'Consistent cards, nav, spacing, focus rings, and premium typography on dark glass.',
  },
  {
    label: 'Advanced features',
    detail: 'Bulk edits, presets, imports/exports with audit stamps, and undo for destructive actions.',
  },
  {
    label: 'Perfect UX',
    detail: 'Guided flows, inline education, recoverable errors, and <1.5s p75 load with <400ms interactions.',
  },
]

const successMetrics = [
  { label: 'Upgrade intent', value: '+35%', note: 'Scouting page to billing CTA' },
  { label: 'Task completion', value: '<2 steps', note: 'Critical edits and saves' },
  { label: 'Latency p75', value: '<1.5s', note: 'Page load and interactions' },
  { label: 'Bug rate', value: '<0.5%', note: 'Failed saves/imports' },
]

const iaPrinciples = [
  'Order: Premium -> Experience -> Data -> AI -> Trust -> Analytics -> QA -> Workspace.',
  'Sticky nav on desktop; chip nav on mobile; scroll anchors align to headings.',
  'Reuse SectionHeader, GlassCard, Pill, StatBadge for consistency.',
]

const visualSystem = [
  'Typography: display 32/24/20, body 16/14; uppercase pills at 0.22em tracking.',
  'Color: normalized brand accent, emerald for success, amber for warnings, cyan for info.',
  'Spacing: 8/12/16/24 grid; radius 24px on cards; full radius on chips and pills.',
  'States: hover/active/focus rings on buttons; disabled opacity; skeletons for loading.',
]

const interactionPolish = [
  'Hover/active/focus styles on all primary and secondary actions.',
  'Skeletons and shimmer placeholders while fetching scouting data.',
  'Optimistic saves for edits with spinner-to-check confirmation and rollback on error.',
  'Latency masking: keep layout stable with placeholders and inline spinners.',
]

const accessibilityChecklist = [
  'Keyboard tab order through nav, filters, tables, and actions.',
  'ARIA labels on tables, filters, and toggles; descriptive headers and captions.',
  'Screen-reader friendly headings and section ids matching nav anchors.',
  'WCAG AA contrast on dark UI for buttons, pills, and status badges.',
]

const dataIntegrityPlan = [
  'Validate Supabase errors; show recoverable states with retry and preserved input.',
  'Empty and error states for scout reports, cut-ups, and tags.',
  'Rollback paths on failed mutations; log errors with context.',
]

const advancedControls = [
  'Opponent presets for tendencies and personnel groupings.',
  'Bulk tag edits and batch updates with undo.',
  'Import/export scouting data with audit stamps and hash checks.',
]

const aiDifferentiators = [
  'Inline AI scouting summaries with confidence indicators.',
  'What-if controls (adjust blitz rate, coverage shells) to see projected impact.',
  'Contextual live call recommendations tied to opponent tendencies.',
]

const educationPlan = [
  'Inline tooltips for metrics and glossary terms.',
  'Quick-start checklist for a new opponent: import, map tags, review errors, publish.',
  'Empty states with guided actions for first-time scouting.',
]

const performancePlan = [
  'Cache per-opponent data; prefetch linked routes for reports and film cut-ups.',
  'Paginate or virtualize long scout lists and logs.',
  'Target <400ms interactions for filters, saves, and AI requests.',
]

const mobilePrinciples = [
  'Gesture-friendly 44px tap targets and taller inputs.',
  'Reduced columns on small screens with persistent filter chip bar.',
  'Parity of premium CTAs and audit snippets on mobile.',
]

const securityTrust = [
  'Role-aware controls for coach/analyst/admin with protected actions.',
  'MFA prompt banner and data residency note near exports and downloads.',
  'Audit log snippet for scouting edits, imports, and downloads.',
]

const billingUpsell = [
  'Plan badge on page header and inline locked premium blocks with Unlock Premium CTA.',
  'Compare plans modal link near premium controls.',
  'Upgrade CTA near AI recommendations and imports to highlight premium value.',
]

const analyticsPlan = [
  'Nav clicks by section id and role.',
  'Filter changes, AI usage, exports/downloads.',
  'Save success/error events with timing and error codes.',
  'Upsell CTA views/clicks and conversion to billing.',
]

const qaChecklist = [
  'Visual regression on cards and tables.',
  'Cross-browser/device smoke (desktop and mobile).',
  'Keyboard-only and screen-reader pass.',
  'Seeded data test scripts for import, edit, save, export.',
]

const launchReadiness = [
  'Release notes highlighting premium scouting improvements.',
  'Support playbook for scouting workflows and recoveries.',
  'In-app announcement with premium CTA and fallback rollback checklist.',
]

export default async function ScoutingPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error('Error fetching auth user for scouting:', authError.message)
  }

  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('active_team_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error fetching profile for scouting:', profileError.message)
  }

  const activeTeamId = profile?.active_team_id as string | null

  if (!activeTeamId) {
    return (
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <SectionHeader
          eyebrow="Scouting"
          title="Activate a team"
          description="Pick an active team in Settings before you manage scouting intel."
          badge="Access needed"
          actions={<Pill label="Secure" tone="amber" icon={<ShieldAlert className="h-3 w-3" />} />}
        />
        <GlassCard tone="amber">
          <p className="text-sm text-amber-100">
            Select or activate a team in Settings before managing scouting.
          </p>
        </GlassCard>
      </main>
    )
  }

  const { data: membership, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', activeTeamId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError) {
    console.error('Error fetching membership for scouting:', membershipError.message)
  }

  if (!membership) {
    return (
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <SectionHeader
          eyebrow="Scouting"
          title="Access restricted"
          description="You do not have access to this team."
          badge="Permission"
          actions={<Pill label="Switch team" tone="amber" />}
        />
        <GlassCard tone="amber">
          <p className="text-sm text-amber-100">
            You do not have access to this team. Please switch to a team you belong to.
          </p>
        </GlassCard>
      </main>
    )
  }

  const [{ data: opponentsData, error: opponentsError }, { data: importsData, error: importsError }] =
    await Promise.all([
      supabase
        .from('scout_plays')
        .select('opponent_name, season')
        .eq('team_id', activeTeamId),
      supabase
        .from('scout_imports')
        .select(
          'id, opponent_name, season, status, created_at, original_filename, file_hash, error_log'
        )
        .eq('team_id', activeTeamId)
        .order('created_at', { ascending: false }),
    ])

  if (opponentsError) {
    console.error('Error fetching opponents for scouting:', opponentsError.message)
  }

  if (importsError) {
    console.error('Error fetching imports for scouting:', importsError.message)
  }

  const opponents =
    opponentsData && opponentsData.length > 0
      ? Array.from(
          new Map(
            opponentsData.map((o) => {
              const key = `${o.opponent_name || ''}|${o.season || ''}`
              return [key, { opponent: o.opponent_name, season: o.season }]
            })
          ).values()
        )
      : [{ opponent: 'Set Opponent', season: '' }]

  const imports = importsData ?? []

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <SectionHeader
        eyebrow="Scouting"
        title="Scouting Command Center"
        description="Premium scouting workspace with AI insights, polished controls, and reliable data for game-day confidence."
        badge="$299/mo Premium"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Pill label="AI ready" tone="cyan" icon={<Sparkles className="h-3 w-3" />} />
            <Pill label="Advanced" tone="emerald" icon={<Gauge className="h-3 w-3" />} />
            <TrackedCTAButton
              href="/settings#billing"
              variant="secondary"
              size="sm"
              event="scouting_cta_click"
              payload={{ cta: 'manage_plan' }}
            >
              Manage plan
            </TrackedCTAButton>
          </div>
        }
      />

      <GlassCard>
        <div className="grid gap-3 md:grid-cols-4">
          {successMetrics.map((metric, idx) => (
            <StatBadge
              key={metric.label}
              label={metric.label}
              value={metric.value}
              tone={idx === 0 ? 'amber' : idx === 1 ? 'emerald' : idx === 2 ? 'cyan' : 'slate'}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          KPIs roll up to upgrade intent, task completion speed, performance targets, and bug rate
          on scouting workflows.
        </p>
      </GlassCard>

      <div className="lg:hidden">
        <ScoutingNav items={navItems} variant="mobile" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px,1fr]">
        <aside className="hidden lg:block">
          <GlassCard padding="none" className="sticky top-6">
            <ScoutingNav items={navItems} variant="desktop" />
          </GlassCard>
        </aside>

        <div className="space-y-12">
          <ScoutingSection id="premium" title="Premium goals and success metrics">
            <ScoutingCard title="Personas, value pillars, and KPIs">
              <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Personas and goals
                  </p>
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
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Premium value pillars
                  </p>
                  <div className="space-y-2">
                    {valuePillars.map((pillar) => (
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
              </div>
            </ScoutingCard>
          </ScoutingSection>

          <ScoutingSection id="experience" title="Experience, IA, visual system, and accessibility">
            <ScoutingCard title="Information architecture and visual system">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">IA</p>
                  <ul className="space-y-2 text-xs text-slate-400">
                    {iaPrinciples.map((item) => (
                      <li key={item} className="rounded-xl border border-slate-800 bg-black/30 p-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Visual system
                  </p>
                  <ul className="space-y-2 text-xs text-slate-400">
                    {visualSystem.map((item) => (
                      <li key={item} className="rounded-xl border border-slate-800 bg-black/30 p-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScoutingCard>

            <ScoutingCard title="Interaction polish and accessibility">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Interaction polish
                  </p>
                  <ul className="space-y-2 text-xs text-slate-400">
                    {interactionPolish.map((item) => (
                      <li key={item} className="rounded-xl border border-slate-800 bg-black/30 p-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Accessibility</p>
                  <ul className="space-y-2 text-xs text-slate-400">
                    {accessibilityChecklist.map((item) => (
                      <li key={item} className="rounded-xl border border-slate-800 bg-black/30 p-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScoutingCard>
          </ScoutingSection>

          <ScoutingSection
            id="data"
            title="Data integrity, advanced controls, performance, and mobile readiness"
          >
            <ScoutingCard title="Data integrity and advanced controls">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Data integrity
                  </p>
                  <ul className="space-y-2 text-xs text-slate-400">
                    {dataIntegrityPlan.map((item) => (
                      <li key={item} className="rounded-xl border border-slate-800 bg-black/30 p-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Advanced controls
                  </p>
                  <ul className="space-y-2 text-xs text-slate-400">
                    {advancedControls.map((item) => (
                      <li key={item} className="rounded-xl border border-slate-800 bg-black/30 p-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScoutingCard>

            <ScoutingCard title="Performance and mobile">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Performance
                  </p>
                  <ul className="space-y-2 text-xs text-slate-400">
                    {performancePlan.map((item) => (
                      <li key={item} className="rounded-xl border border-slate-800 bg-black/30 p-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-cyan-200" />
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Mobile and responsive
                    </p>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-400">
                    {mobilePrinciples.map((item) => (
                      <li key={item} className="rounded-xl border border-slate-800 bg-black/30 p-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScoutingCard>
          </ScoutingSection>

          <ScoutingSection id="ai" title="AI differentiation and contextual education">
            <ScoutingCard title="AI features">
              <div className="space-y-2">
                {aiDifferentiators.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-black/30 p-3"
                  >
                    <Rocket className="mt-1 h-4 w-4 text-cyan-200" />
                    <p className="text-xs text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </ScoutingCard>

            <ScoutingCard title="Contextual education">
              <div className="space-y-2">
                {educationPlan.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-800 bg-black/30 p-3 text-xs text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </ScoutingCard>
          </ScoutingSection>

          <ScoutingSection id="security" title="Security, trust, and upsell integration">
            <ScoutingCard title="Security and trust">
              <div className="grid gap-3 sm:grid-cols-2">
                {securityTrust.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-black/30 p-3"
                  >
                    <Shield className="mt-1 h-4 w-4 text-emerald-200" />
                    <p className="text-xs text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </ScoutingCard>

            <ScoutingCard title="Billing and upsell">
              <div className="grid gap-3 sm:grid-cols-3">
                {billingUpsell.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-800 bg-black/30 p-3 text-xs text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <TrackedCTAButton
                  href="/settings#billing"
                  size="sm"
                  event="scouting_cta_click"
                  payload={{ cta: 'unlock_premium' }}
                >
                  Unlock Premium
                </TrackedCTAButton>
                <TrackedCTAButton
                  href="/pricing"
                  variant="secondary"
                  size="sm"
                  event="scouting_cta_click"
                  payload={{ cta: 'compare_plans' }}
                >
                  Compare plans
                </TrackedCTAButton>
              </div>
            </ScoutingCard>
          </ScoutingSection>

          <ScoutingSection id="analytics" title="Analytics and instrumentation">
            <ScoutingCard title="Scouting analytics plan">
              <div className="grid gap-3 sm:grid-cols-2">
                {analyticsPlan.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-black/30 p-3"
                  >
                    <BarChart3 className="mt-1 h-4 w-4 text-cyan-200" />
                    <p className="text-xs text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </ScoutingCard>
          </ScoutingSection>

          <ScoutingSection id="qa" title="QA, testing, and launch readiness">
            <ScoutingCard title="QA plan">
              <div className="grid gap-3 sm:grid-cols-2">
                {qaChecklist.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-800 bg-black/30 p-3 text-xs text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </ScoutingCard>

            <ScoutingCard title="Launch readiness">
              <div className="grid gap-3 sm:grid-cols-3">
                {launchReadiness.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-800 bg-black/30 p-3 text-xs text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </ScoutingCard>
          </ScoutingSection>

          <ScoutingSection id="workspace" title="Scouting workspace">
            <ScoutingCard
              title="Opponent intelligence workspace"
              description="Upload CSV data, review errors, pull tendencies, and drive AI-assisted scouting."
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Pill label="Live" tone="cyan" icon={<Crosshair className="h-3 w-3" />} />
                  <Pill label="Secure" tone="emerald" icon={<Lock className="h-3 w-3" />} />
                </div>
              }
            >
              {importsError ? (
                <GlassCard tone="amber">
                  <p className="text-sm text-amber-100">
                    Failed to load imports: {importsError.message}
                  </p>
                </GlassCard>
              ) : (
                <GlassCard>
                  <ScoutingBoard teamId={activeTeamId} opponents={opponents} imports={imports} />
                </GlassCard>
              )}
              {opponentsError ? (
                <p className="mt-3 text-xs text-amber-200">
                  Opponent data failed to load; retry or refresh to continue.
                </p>
              ) : null}
              <div className="mt-4 grid gap-3 md:grid-cols-3 text-xs text-slate-400">
                <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
                  <p className="font-semibold text-slate-100">Performance targets</p>
                  <p>Prefetch opponent data, cache lists, keep interactions under 400ms.</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
                  <p className="font-semibold text-slate-100">Reliability</p>
                  <p>Optimistic saves with rollback, error toasts, and preserved input.</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
                  <p className="font-semibold text-slate-100">Mobile parity</p>
                  <p>Chip nav, reduced columns, and accessible touch targets on phones.</p>
                </div>
              </div>
            </ScoutingCard>
          </ScoutingSection>
        </div>
      </div>
    </main>
  )
}

function ScoutingSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="space-y-4 scroll-mt-24">
      <div>
        <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">Section</p>
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function ScoutingCard({
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
          {description ? <p className="text-sm text-slate-400">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </GlassCard>
  )
}
