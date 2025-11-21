import Link from 'next/link'
import { seedChartTags, seedPositionGroups, seedSchedule, finishQuickstart } from './actions'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { SubmitButton } from './SubmitButton'

function StepBadge({ state }: { state: 'pending' | 'done' }) {
  return (
    <span
      className={`text-[0.65rem] uppercase tracking-[0.3em] rounded-full px-3 py-1 ${
        state === 'done'
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
          : 'border border-slate-800 text-slate-500'
      }`}
    >
      {state === 'done' ? 'Done' : 'Setup'}
    </span>
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
      <header className="space-y-2">
        <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">Quickstart Wizard</p>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-50">
          Launch your program in minutes
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          We'll seed roster groups, tags, and a sample schedule so analysts can start charting right
          away. You can refine everything later from Settings and Games.
        </p>
        <p className="text-xs text-slate-500">
          Signed in as <span className="font-semibold text-slate-200">{displayName}</span> for{' '}
          <span className="font-semibold text-slate-200">{team?.name || 'your team'}</span>.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-900/70 bg-surface-raised/70 p-5 space-y-3">
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
          <form action={seedPositionGroups} className="pt-1">
            <SubmitButton
              disabled={states.positionGroups}
              label={states.positionGroups ? 'Applied' : 'Apply defaults'}
              pendingLabel="Applying..."
              className="w-full rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
            />
          </form>
        </div>

        <div className="rounded-3xl border border-slate-900/70 bg-surface-raised/70 p-5 space-y-3">
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
          <form action={seedChartTags} className="pt-1">
            <SubmitButton
              disabled={states.tags}
              label={states.tags ? 'Added' : 'Add starter tags'}
              pendingLabel="Adding..."
              className="w-full rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
            />
          </form>
        </div>

        <div className="rounded-3xl border border-slate-900/70 bg-surface-raised/70 p-5 space-y-3">
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
          <form action={seedSchedule} className="pt-1">
            <SubmitButton
              disabled={states.schedule}
              label={states.schedule ? 'Game created' : 'Create sample game'}
              pendingLabel="Creating..."
              className="w-full rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
            />
          </form>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-900/70 bg-black/20 p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-100">Ready to roll</p>
          <p className="text-xs text-slate-500">
            You can refine settings later. Jump into the dashboard or games to start charting.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={finishQuickstart}>
            <SubmitButton
              label={allDone ? 'Finish & go to dashboard' : 'Mark complete anyway'}
              pendingLabel="Finishing..."
              className="rounded-full bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
            />
          </form>
          <Link
            href="/games"
            className="rounded-full border border-slate-700 px-5 py-2 text-xs font-semibold text-slate-200"
          >
            View games
          </Link>
        </div>
      </div>
    </section>
  )
}
