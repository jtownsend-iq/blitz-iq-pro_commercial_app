import Link from 'next/link'
import { CheckCircle2, PlayCircle, Rocket, Shield } from 'lucide-react'
import { seedChartTags, seedPositionGroups, seedSchedule, finishQuickstart } from './actions'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { SubmitButton } from './SubmitButton'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Pill } from '@/components/ui/Pill'

function StepBadge({ state }: { state: 'pending' | 'done' }) {
  return (
    <Pill
      label={state === 'done' ? 'Done' : 'Setup'}
      tone={state === 'done' ? 'emerald' : 'slate'}
      icon={state === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
    />
  )
}

export default async function QuickstartPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, active_team_id')
    .eq('id', user.id)
    .maybeSingle()

  const { data: team } = await supabase
    .from('teams')
    .select('name')
    .eq('id', profile?.active_team_id || '')
    .maybeSingle()

  const displayName = profile?.full_name || user.email || 'Coach'
  const { data: progress } = await supabase
    .from('quickstart_progress')
    .select('seeded_position_groups, seeded_tags, seeded_schedule, completed_at')
    .eq('team_id', profile?.active_team_id || '')
    .maybeSingle()

  const states = {
    positionGroups: progress?.seeded_position_groups ?? false,
    tags: progress?.seeded_tags ?? false,
    schedule: progress?.seeded_schedule ?? false,
  }
  const allDone = states.positionGroups && states.tags && states.schedule

  return (
    <section className="space-y-8">
      <SectionHeader
        eyebrow="Quickstart Wizard"
        title="Launch your program in minutes"
        description="We seed roster groups, tags, and a sample schedule so analysts can start charting right away."
        badge="Guided setup"
        actions={<Pill label={`Signed in as ${displayName}`} tone="cyan" />}
      />

      <GlassCard>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <Rocket className="h-5 w-5 text-emerald-300" />
          <span>
            Applying to <span className="font-semibold text-slate-50">{team?.name || 'your team'}</span>.
          </span>
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard padding="md" interactive>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 1</p>
              <h2 className="text-lg font-semibold text-slate-50">Seed position groups</h2>
              <p className="text-sm text-slate-400">
                Create offense, defense, and specialists groupings to power roster and charting views.
              </p>
            </div>
            <StepBadge state={states.positionGroups ? 'done' : 'pending'} />
          </div>
          <form
            action={async () => {
              'use server'
              await seedPositionGroups()
            }}
            className="pt-3"
          >
            <SubmitButton
              disabled={states.positionGroups}
              label={states.positionGroups ? 'Applied' : 'Apply defaults'}
              pendingLabel="Applying..."
              className="w-full rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black shadow-[0_15px_40px_-18px_rgba(0,229,255,0.6)]"
            />
          </form>
        </GlassCard>

        <GlassCard padding="md" interactive>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 2</p>
              <h2 className="text-lg font-semibold text-slate-50">Seed chart tags</h2>
              <p className="text-sm text-slate-400">
                Preload common formations, personnel, fronts, and pressures to speed up analyst entry.
              </p>
            </div>
            <StepBadge state={states.tags ? 'done' : 'pending'} />
          </div>
          <form
            action={async () => {
              'use server'
              await seedChartTags()
            }}
            className="pt-3"
          >
            <SubmitButton
              disabled={states.tags}
              label={states.tags ? 'Added' : 'Add starter tags'}
              pendingLabel="Adding..."
              className="w-full rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black shadow-[0_15px_40px_-18px_rgba(0,229,255,0.6)]"
            />
          </form>
        </GlassCard>

        <GlassCard padding="md" interactive>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 3</p>
              <h2 className="text-lg font-semibold text-slate-50">Seed a schedule</h2>
              <p className="text-sm text-slate-400">
                Drop in a sample upcoming game so you can start sessions immediately.
              </p>
            </div>
            <StepBadge state={states.schedule ? 'done' : 'pending'} />
          </div>
          <form
            action={async () => {
              'use server'
              await seedSchedule()
            }}
            className="pt-3"
          >
            <SubmitButton
              disabled={states.schedule}
              label={states.schedule ? 'Game created' : 'Create sample game'}
              pendingLabel="Creating..."
              className="w-full rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black shadow-[0_15px_40px_-18px_rgba(0,229,255,0.6)]"
            />
          </form>
        </GlassCard>
      </div>

      <GlassCard className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-100">Ready to roll</p>
          <p className="text-xs text-slate-400">
            You can refine settings later. Jump into the dashboard or games to start charting.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={finishQuickstart}>
            <SubmitButton
              label={allDone ? 'Finish & go to dashboard' : 'Mark complete anyway'}
              pendingLabel="Finishing..."
              className="rounded-full bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black shadow-[0_15px_40px_-18px_rgba(0,229,255,0.6)]"
            />
          </form>
          <Link
            href="/games"
            className="rounded-full border border-white/15 px-5 py-2 text-xs font-semibold text-slate-200 hover:border-brand hover:text-white transition flex items-center gap-2"
          >
            <PlayCircle className="h-4 w-4" /> View games
          </Link>
        </div>
      </GlassCard>
    </section>
  )
}
