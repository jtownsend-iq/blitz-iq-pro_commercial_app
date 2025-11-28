import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { Clock3, Crosshair, ShieldAlert, Table2 } from 'lucide-react'
import ScoutingBoard from '@/components/scout/ScoutingBoard'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { StatBadge } from '@/components/ui/StatBadge'
import { ScoutingNav } from '@/components/scout/ScoutingNav'

type ImportRow = {
  id: string
  opponent_name: string
  season: string | null
  status: string
  created_at: string
  original_filename: string | null
  file_hash: string | null
  error_log?: Record<string, unknown> | null
}

type PlayRow = {
  opponent_name: string | null
  season: string | null
  phase: string | null
  down: number | null
  distance: number | null
  hash: string | null
  formation: string | null
  personnel: string | null
  play_family: string | null
  tags: string[] | null
  gained_yards: number | null
  created_at: string | null
}

const navItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'imports', label: 'CSV imports' },
  { id: 'workspace', label: 'Scouting workspace' },
  { id: 'ai', label: 'AI & reports' },
  { id: 'help', label: 'How it works' },
]

export default async function ScoutingPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('active_team_id')
    .eq('id', user.id)
    .maybeSingle()

  const activeTeamId = profile?.active_team_id as string | null

  if (!activeTeamId) {
    return (
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <SectionHeader
          eyebrow="Scouting"
          title="Activate a team"
          description="Set an active team in Settings before running opponent scouting."
          badge="Team needed"
          actions={<Pill label="Activate team" tone="amber" icon={<ShieldAlert className="h-3 w-3" />} />}
        />
        <GlassCard tone="amber">
          <p className="text-sm text-amber-100">
            Activate a team in Settings, then upload scouting CSVs and view opponent tendencies.
          </p>
        </GlassCard>
      </main>
    )
  }

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', activeTeamId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return (
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <SectionHeader
          eyebrow="Scouting"
          title="Access restricted"
          description="You are not on staff for this team. Switch to a team where you are a member to manage scouting."
          badge="Permission"
          actions={<Pill label="Switch team" tone="amber" />}
        />
        <GlassCard tone="amber">
          <p className="text-sm text-amber-100">
            Join the staff for this program or switch to a team where you are on staff before using scouting.
          </p>
        </GlassCard>
      </main>
    )
  }

  const [{ data: playsData }, { data: importsData, error: importsError }] = await Promise.all([
    supabase
      .from('scout_plays')
      .select(
        'opponent_name, season, phase, down, distance, hash, formation, personnel, play_family, tags, gained_yards, created_at'
      )
      .eq('team_id', activeTeamId),
    supabase
      .from('scout_imports')
      .select('id, opponent_name, season, status, created_at, original_filename, file_hash, error_log')
      .eq('team_id', activeTeamId)
      .order('created_at', { ascending: false }),
  ])

  const plays = (playsData as PlayRow[] | null) ?? []
  const imports = (importsData as ImportRow[] | null) ?? []

  const lastSuccess = imports.find((imp) => imp.status === 'completed')
  const lastSuccessTs = lastSuccess?.created_at ?? null

  const opponentSet = new Set<string>()
  plays.forEach((p) => {
    if (p.opponent_name) opponentSet.add(p.opponent_name)
  })
  imports.forEach((imp) => {
    if (imp.opponent_name) opponentSet.add(imp.opponent_name)
  })
  const uniqueOpponentsList =
    opponentSet.size > 0
      ? Array.from(opponentSet).map((opp) => ({ opponent: opp, season: '' }))
      : [{ opponent: 'Set Opponent', season: '' }]

  const upcomingImport =
    imports.find((imp) => imp.status === 'completed') ??
    imports.find((imp) => imp.status === 'pending') ??
    null

  const upcomingOpponent = upcomingImport?.opponent_name || plays[0]?.opponent_name || ''
  const upcomingSeason = upcomingImport?.season || plays[0]?.season || ''

  const playsForUpcoming = plays.filter(
    (p) =>
      (p.opponent_name || '') === (upcomingOpponent || '') &&
      (upcomingSeason ? p.season === upcomingSeason : true)
  )

  const summaryStats = computeSummaryStats(imports, plays)
  const tendencyPanels = buildTendencyPanels(playsForUpcoming)

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-10">
      <SectionHeader
        eyebrow="Scouting"
        title="Opponent scouting workspace"
        description="Upload opponent CSVs, clean errors, and let BlitzIQ's OpenAI LLM analyze that data for tendencies and reports - no model training required."
        badge="Premium"
        actions={<Pill label="Scouting ready" tone="emerald" icon={<Crosshair className="h-3 w-3" />} />}
      />

      <GlassCard>
        <div className="grid gap-4 md:grid-cols-4">
          <StatBadge label="Opponent-season pairs" value={summaryStats.opponentSeasons} tone="cyan" />
          <StatBadge label="Opponents scouted" value={summaryStats.opponents} tone="emerald" />
          <StatBadge label="Imports processed" value={summaryStats.imports} tone="amber" />
          <StatBadge label="Imports needing fix" value={summaryStats.failedImports} tone="slate" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <Clock3 className="h-3.5 w-3.5 text-slate-500" />
          <span>
            Last successful import:{' '}
            {lastSuccessTs ? new Date(lastSuccessTs).toLocaleString() : 'No successful imports yet'}
          </span>
          <span className="text-slate-600">|</span>
          <span>{summaryStats.opponents} opponents | {summaryStats.opponentSeasons} opponent-season pairs</span>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Upcoming opponent</p>
            <h2 className="text-xl font-semibold text-slate-100">
              {upcomingOpponent || 'Set your next opponent'}
            </h2>
            <p className="text-sm text-slate-400">
              Fast reads for offense, defense, and special teams based on your latest scouting CSVs.
            </p>
          </div>
          <Pill label="Tendencies" tone="cyan" icon={<Crosshair className="h-3 w-3" />} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {tendencyPanels.map((panel) => (
            <GlassCard key={panel.label} padding="md" className="h-full bg-black/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">{panel.label}</p>
                  <p className="text-sm font-semibold text-slate-100">{panel.headline}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] uppercase tracking-[0.18em] text-slate-200">
                  {panel.split}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                {panel.callouts.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="mt-3 text-[0.7rem] uppercase tracking-[0.18em] text-slate-500">
                {panel.cta}
              </p>
            </GlassCard>
          ))}
        </div>
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
          <ScoutingSection id="overview" title="Overview">
            <GlassCard className="space-y-3">
              <p className="text-sm text-slate-300">
                Export CSVs from your film or analytics tools, pick the opponent and season, upload and
                map columns, clear any errors, and BlitzIQ&apos;s OpenAI-powered layer will surface
                tendencies for pregame reports and in-game calls.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <StatBadge label="Opponents covered" value={summaryStats.opponents} tone="cyan" />
                <StatBadge label="Opponent-season pairs" value={summaryStats.opponentSeasons} tone="emerald" />
                <StatBadge label="Imports to fix" value={summaryStats.failedImports} tone="amber" />
              </div>
              <p className="text-xs text-slate-400">
                Clean imports feed every tendency panel and pregame report. Fix failed imports to trust
                AI reports and game-day recommendations.
              </p>
            </GlassCard>
          </ScoutingSection>

          <ScoutingSection id="imports" title="CSV imports">
            <GlassCard className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Imports</p>
                  <h3 className="text-base font-semibold text-slate-100">History & cleanup</h3>
                  <p className="text-sm text-slate-400">
                    Upload CSVs, see status, and preview errors so you can fix headers, tags, or formats.
                  </p>
                </div>
                <Pill label="CSV" tone="cyan" icon={<Table2 className="h-3 w-3" />} />
              </div>

              {importsError ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  Failed to load imports: {importsError.message}
                </div>
              ) : null}

              {imports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-4">
                  <p className="text-sm font-semibold text-slate-200">No imports yet</p>
                  <p className="text-xs text-slate-500">Upload scouting CSVs to power BlitzIQ&apos;s LLM analysis for pregame reports and in-game tendencies.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-slate-200">
                    <thead className="bg-white/5 text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Opponent</th>
                        <th className="px-3 py-2 text-left font-medium">Season</th>
                        <th className="px-3 py-2 text-left font-medium">File</th>
                        <th className="px-3 py-2 text-left font-medium">Created</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-left font-medium">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {imports.map((imp) => {
                        const hasError = imp.status === 'failed' || (imp.error_log && Object.keys(imp.error_log).length)
                        return (
                          <tr key={imp.id} className="border-t border-slate-900/50">
                            <td className="px-3 py-2">{imp.opponent_name}</td>
                            <td className="px-3 py-2">{imp.season || '--'}</td>
                            <td className="px-3 py-2">{imp.original_filename || imp.file_hash || '--'}</td>
                            <td className="px-3 py-2 text-slate-400">
                              {new Date(imp.created_at).toLocaleString()}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  imp.status === 'completed'
                                    ? 'bg-emerald-500/15 text-emerald-100'
                                    : imp.status === 'failed'
                                    ? 'bg-rose-500/15 text-rose-100'
                                    : 'bg-amber-500/15 text-amber-100'
                                }`}
                              >
                                {imp.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-300">
                              {hasError ? (
                                <details className="space-y-1 rounded border border-slate-800 bg-slate-900/60 px-3 py-2">
                                  <summary className="cursor-pointer text-amber-200">View log</summary>
                                  <pre className="whitespace-pre-wrap break-words text-[0.7rem] text-slate-200">
                                    {JSON.stringify(imp.error_log, null, 2)}
                                  </pre>
                                </details>
                              ) : (
                                <span className="text-slate-500">--</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </ScoutingSection>

          <ScoutingSection id="workspace" title="Scouting workspace">
            <GlassCard className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Workspace</p>
                  <h3 className="text-base font-semibold text-slate-100">Upload, map, clean, explore</h3>
                  <p className="text-sm text-slate-400">
                    Select opponents, upload CSVs, map columns to BlitzIQ tags, resolve row errors, and explore tendencies so data is ready for analysis.
                  </p>
                </div>
                <Pill label="Live data" tone="emerald" />
              </div>
              {importsError ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  Imports failed to load. Retry after fixing the file or headers.
                </div>
              ) : null}
              <GlassCard>
                <ScoutingBoard teamId={activeTeamId} opponents={uniqueOpponentsList} imports={imports} />
              </GlassCard>
            </GlassCard>
          </ScoutingSection>

          <ScoutingSection id="ai" title="AI & reports">
            <GlassCard className="space-y-3">
              <p className="text-sm text-slate-300">
                Once CSVs are imported and clean, BlitzIQ sends your structured scouting data to an OpenAI LLM at query
                time - no model training or fine-tuning required. It generates pregame summaries and game-day insights by
                down/distance, personnel, formation, front, coverage, pressure, and special teams situations.
              </p>
              <p className="text-sm text-slate-300">
                Use the reports and exports you already run from the scouting workspace to open pregame packets and game-ready
                cutups in one click for the upcoming opponent.
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Pregame tendency report</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Down & distance</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Front & coverage</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Pressure & stunts</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Special teams looks</span>
              </div>
            </GlassCard>
          </ScoutingSection>

          <ScoutingSection id="help" title="How it works">
            <GlassCard className="space-y-3">
              <p className="text-sm text-slate-300">
                Export scouting CSVs from your film or analytics tools. Upload them here, map columns, and clear any
                errors. Once clean, every tendency panel, pregame report, and in-game recommendation uses this data across
                BlitzIQ. Repeat each week for your next opponent - the flow stays the same, so your staff stays fast.
              </p>
              <p className="text-sm text-slate-300">
                Clean data in means trusted reports out. If an import fails, open the log, fix headers or tags, and reupload.
                When the import is green, you can trust the AI summaries and live charts.
              </p>
            </GlassCard>
          </ScoutingSection>
        </div>
      </div>
    </main>
  )
}

function ScoutingSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
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

function computeSummaryStats(imports: ImportRow[], plays: PlayRow[]) {
  const opponents = new Set<string>()
  const opponentSeasons = new Set<string>()
  plays.forEach((p) => {
    const opp = p.opponent_name || ''
    const season = p.season || ''
    if (opp) opponents.add(opp)
    if (opp || season) opponentSeasons.add(`${opp}|${season}`)
  })
  imports.forEach((imp) => {
    const opp = imp.opponent_name || ''
    const season = imp.season || ''
    if (opp) opponents.add(opp)
    if (opp || season) opponentSeasons.add(`${opp}|${season}`)
  })
  opponentSeasons.delete('|')
  return {
    opponents: opponents.size,
    opponentSeasons: opponentSeasons.size,
    imports: imports.length,
    failedImports: imports.filter((imp) => imp.status !== 'completed').length,
  }
}

function buildTendencyPanels(plays: PlayRow[]) {
  const offense = plays.filter((p) => (p.phase || '').toUpperCase() === 'OFFENSE')
  const defense = plays.filter((p) => (p.phase || '').toUpperCase() === 'DEFENSE')
  const special = plays.filter((p) => (p.phase || '').toUpperCase().includes('SPECIAL'))

  return [
    buildPanel('Offense', offense, 'Open scouting workspace for more offense detail'),
    buildPanel('Defense', defense, 'Open scouting workspace for more defense detail'),
    buildPanel('Special teams', special, 'Open scouting workspace for special teams detail'),
  ]
}

function buildPanel(label: string, plays: PlayRow[], cta: string) {
  const total = plays.length || 1
  const runPlays = plays.filter((p) => includesAny(p, ['run']))
  const passPlays = plays.filter((p) => includesAny(p, ['pass']))
  const runRate = Math.round((runPlays.length / total) * 100)
  const passRate = Math.round((passPlays.length / total) * 100)

  const topFormation = topValue(plays.map((p) => p.formation))
  const topPersonnel = topValue(plays.map((p) => p.personnel))
  const topPlayFamily = topValue(plays.map((p) => p.play_family))
  const blitzPlays = plays.filter((p) => includesAny(p, ['blitz', 'pressure']))
  const blitzRate = Math.round((blitzPlays.length / total) * 100)

  const split = label === 'Offense' ? `${runRate}% run / ${passRate}% pass` : `${blitzRate}% pressure looks`

  const callouts: string[] = []
  if (topFormation) callouts.push(`Most used formation: ${topFormation}`)
  if (topPersonnel) callouts.push(`Top personnel: ${topPersonnel}`)
  if (topPlayFamily) callouts.push(`Leaning on: ${topPlayFamily}`)
  if (label !== 'Offense' && blitzPlays.length) callouts.push(`Pressure rate: ${blitzRate}%`)
  if (callouts.length === 0) callouts.push('Add CSVs to see tendencies.')

  return {
    label,
    headline: callouts[0] || 'No data yet',
    callouts,
    split,
    cta,
  }
}

function includesAny(play: PlayRow, keywords: string[]) {
  const family = (play.play_family || '').toLowerCase()
  const tags = (play.tags || []).map((t) => t.toLowerCase())
  return keywords.some((kw) => family.includes(kw) || tags.some((t) => t.includes(kw)))
}

function topValue(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>()
  values.forEach((v) => {
    if (!v) return
    const key = v.toString()
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  let best = ''
  let bestCount = 0
  counts.forEach((count, key) => {
    if (count > bestCount) {
      best = key
      bestCount = count
    }
  })
  return best
}


