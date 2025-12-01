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
import { CTAButton } from '@/components/ui/CTAButton'

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
  { id: 'overview', label: 'Status & health' },
  { id: 'workspace', label: 'Scouting workspace' },
  { id: 'imports', label: 'Data inbox' },
  { id: 'ai', label: 'AI & reports' },
  { id: 'help', label: 'Weekly workflow' },
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
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <CTAButton href="/settings" size="sm" variant="primary">
                Go to Settings
              </CTAButton>
              <CTAButton href="/team" size="sm" variant="secondary">
                Switch team
              </CTAButton>
              <Pill label="Team needed" tone="amber" icon={<ShieldAlert className="h-3 w-3" />} />
            </div>
          }
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
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <CTAButton href="/team" size="sm" variant="primary">
                Switch team
              </CTAButton>
              <CTAButton href="/settings" size="sm" variant="secondary">
                Manage access
              </CTAButton>
              <Pill label="Permission" tone="amber" />
            </div>
          }
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

  const { data: upcomingGameData } = await supabase
    .from('games')
    .select('opponent_name, start_time, season_label')
    .eq('team_id', activeTeamId)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(1)

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

  const upcomingOpponent =
    upcomingGameData?.[0]?.opponent_name ||
    upcomingImport?.opponent_name ||
    plays[0]?.opponent_name ||
    ''
  const upcomingSeason =
    upcomingGameData?.[0]?.season_label ||
    upcomingImport?.season ||
    plays[0]?.season ||
    ''

  const playsForUpcoming = plays.filter(
    (p) =>
      (p.opponent_name || '') === (upcomingOpponent || '') &&
      (upcomingSeason ? p.season === upcomingSeason : true)
  )

  const summaryStats = computeSummaryStats(imports, plays)
  const tendencyPanels = buildTendencyPanels(playsForUpcoming, upcomingOpponent, upcomingSeason)

  return (
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-10">
    <SectionHeader
      eyebrow="Scouting"
      title="Scout Friday night with a clean, live board"
      description="Upload opponent film exports, clean them fast, and open the workspace for trustworthy tendencies and reports in minutes."
      badge="Scouting ready"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <CTAButton href="#workspace" variant="primary" size="sm">
            Open scouting workspace
          </CTAButton>
          <CTAButton href="#imports" variant="secondary" size="sm">
            Go to data inbox
          </CTAButton>
          <Pill label="Ready this week" tone="emerald" icon={<Crosshair className="h-3 w-3" />} />
        </div>
      }
    />

      <GlassCard>
        <div className="grid gap-4 md:grid-cols-4">
          <StatBadge label="Opponents on tape" value={summaryStats.opponents} tone="emerald" />
          <StatBadge label="Seasons tracked" value={summaryStats.opponentSeasons} tone="cyan" />
          <StatBadge label="Scouting files processed" value={summaryStats.imports} tone="amber" />
          <StatBadge label="Files needing cleanup" value={summaryStats.failedImports} tone="slate" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <Clock3 className="h-3.5 w-3.5 text-slate-500" />
          <span>
            Last clean import:{' '}
            {lastSuccessTs ? new Date(lastSuccessTs).toLocaleString() : 'No successful imports yet'}
          </span>
          <span className="text-slate-600">|</span>
          <span>Upload the next opponent on tape and clear fixes before you pull reports.</span>
        </div>
      </GlassCard>

          <GlassCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Upcoming opponent tendencies</p>
                <h2 className="text-xl font-semibold text-slate-100">
                  {upcomingOpponent || 'Set your next opponent'} {upcomingSeason ? `| ${upcomingSeason}` : ''}
                </h2>
                <p className="text-sm text-slate-400">
              Phase-by-phase reads for the next opponentâ€”offense, defense, and special teams. Jump into the workspace to drill calls by season, game, and situation.
                </p>
              </div>
              <Pill label="Next opponent ready" tone="cyan" icon={<Crosshair className="h-3 w-3" />} />
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
              <div className="mt-3">
                <CTAButton href={panel.href || '#workspace'} size="sm" variant="secondary">
                  {panel.cta}
                </CTAButton>
              </div>
            </GlassCard>
          ))}
        </div>
          </GlassCard>

      <div className="space-y-8">
        <div className="lg:hidden">
          <ScoutingNav items={navItems} variant="mobile" />
        </div>
        <div className="grid gap-10 lg:grid-cols-[240px,1fr] lg:items-start">
          <aside className="hidden lg:block">
            <GlassCard padding="none" className="sticky top-6">
              <ScoutingNav items={navItems} variant="desktop" />
            </GlassCard>
          </aside>

          <div className="space-y-12">
          <ScoutingSection id="overview" title="Status & health">
            <GlassCard className="space-y-3">
              <p className="text-sm text-slate-300">
                Health check for this week: who&apos;s on tape, what&apos;s clean, and what needs attention before you trust the board.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <StatBadge label="Clean scouting files" value={summaryStats.imports - summaryStats.failedImports} tone="emerald" />
                <StatBadge label="Files to fix" value={summaryStats.failedImports} tone="amber" />
                <StatBadge label="Opponents ready" value={summaryStats.opponents} tone="cyan" />
              </div>
              <p className="text-xs text-slate-400">
                Clear amber items before Friday so the workspace and AI pulls stay trustworthy.
              </p>
            </GlassCard>
          </ScoutingSection>

          <ScoutingSection id="imports" title="Data inbox">
            <GlassCard className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Imports</p>
                  <h3 className="text-base font-semibold text-slate-100">Workspace inbox</h3>
                  <p className="text-sm text-slate-400">
                    Upload film exports, check status, and quickly see what to fix so the workspace stays clean.
                  </p>
                </div>
                <Pill label="CSV" tone="cyan" icon={<Table2 className="h-3 w-3" />} />
              </div>

              {importsError ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  Couldn&apos;t load imports. Refresh, reupload the CSV, or fix headers/tags before trying again. ({importsError.message})
                </div>
              ) : null}

              {imports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-4">
                  <p className="text-sm font-semibold text-slate-200">No imports yet</p>
                  <p className="text-xs text-slate-500">Upload scouting CSVs from your film system to power reports and tendencies.</p>
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
                        <th className="px-3 py-2 text-left font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {imports.map((imp) => {
                        const hasError = imp.status === 'failed' || (imp.error_log && Object.keys(imp.error_log).length)
                        return (
                          <tr
                            key={imp.id}
                            className="border-t border-slate-900/50 transition-colors hover:bg-white/5"
                          >
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
                                  <p className="text-[0.75rem] text-amber-100">
                                    {imp.error_log
                                      ? `Found ${Object.keys(imp.error_log).length} issue type(s). Fix headers/tags and reupload before scouting this opponent.`
                                      : 'Issues detected. Expand for details.'}
                                  </p>
                                  <pre className="whitespace-pre-wrap break-words text-[0.7rem] text-slate-200">
                                    {JSON.stringify(imp.error_log, null, 2)}
                                  </pre>
                                </details>
                              ) : (
                                <span className="text-slate-500">--</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <CTAButton href="#workspace" size="sm" variant="secondary">
                                Open in workspace
                              </CTAButton>
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

          <ScoutingSection id="workspace" title="Scouting command center">
            <GlassCard className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Live scouting board</p>
                  <h3 className="text-base font-semibold text-slate-100">
                    Upload, map, and clean in one place
                  </h3>
                  <p className="text-sm text-slate-400">
                    Select opponents, upload CSVs, map to BlitzIQ tags, resolve errors, and explore tendencies — your daily hub for Friday packets and game-day calls.â€”your daily hub for Friday packets and game-day calls.
                  </p>
                </div>
                <Pill label={`Live data${upcomingOpponent ? ` | ${upcomingOpponent}` : ''}`} tone="emerald" />
              </div>
              {importsError ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  We couldn&apos;t load imports. Refresh, reupload your CSV, or fix headers/tags before trying again.
                </div>
              ) : null}
              <div className="rounded-2xl border border-slate-900/70 bg-surface-muted p-2 md:p-3">
                <ScoutingBoard teamId={activeTeamId} opponents={uniqueOpponentsList} imports={imports} />
              </div>
            </GlassCard>
          </ScoutingSection>

          <ScoutingSection id="ai" title="AI & reports">
            <GlassCard className="space-y-3">
              <p className="text-sm text-slate-300">
                After your workspace is clean, BlitzIQ uses OpenAI to deliver Friday packets, situation-ready cutups, and call sheet insightsâ€”down-and-distance tendencies, personnel tells, formation trends, and pressure looks for the next opponent.
              </p>
              <p className="text-sm text-slate-300">
                Use your reports and exports to spin up phase-by-phase packets in one click; every output stays synced to the data you cleaned in the workspace.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <CTAButton href="#workspace" size="sm" variant="primary">
                  Open workspace
                </CTAButton>
                <CTAButton href="#imports" size="sm" variant="secondary">
                  Review imports
                </CTAButton>
              </div>
            </GlassCard>
          </ScoutingSection>

          <ScoutingSection id="help" title="Weekly workflow">
            <GlassCard className="space-y-3">
              <p className="text-sm text-slate-300">
                Export scouting CSVs, upload and map to BlitzIQ tags, clean any header or row issues, and let the workspace drive your Friday packet and call sheet. Repeat weekly for the next opponent on tape.
              </p>
              <p className="text-sm text-slate-300">
                If an import fails, use the log summary to fix headers or tags, then reupload so AI summaries and live charts stay reliable.
              </p>
            </GlassCard>
          </ScoutingSection>
          </div>
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

function buildTendencyPanels(plays: PlayRow[], opponent: string, season: string | null) {
  const offense = plays.filter((p) => (p.phase || '').toUpperCase() === 'OFFENSE')
  const defense = plays.filter((p) => (p.phase || '').toUpperCase() === 'DEFENSE')
  const special = plays.filter((p) => (p.phase || '').toUpperCase().includes('SPECIAL'))

  return [
    buildPanel('Offense', offense, opponent, season, 'Open offense in workspace'),
    buildPanel('Defense', defense, opponent, season, 'Open defense in workspace'),
    buildPanel('Special teams', special, opponent, season, 'Open special teams in workspace'),
  ]
}

function buildPanel(label: string, plays: PlayRow[], opponent: string, season: string | null, cta: string) {
  const total = plays.length
  const safeTotal = total || 1
  const runPlays = plays.filter((p) => includesAny(p, ['run']))
  const passPlays = plays.filter((p) => includesAny(p, ['pass']))
  const runRate = Math.round((runPlays.length / safeTotal) * 100)
  const passRate = Math.round((passPlays.length / safeTotal) * 100)

  const earlyDown = plays.filter((p) => p.down === 1 || p.down === 2)
  const lateDown = plays.filter((p) => (p.down || 0) >= 3)
  const earlyRun = earlyDown.filter((p) => includesAny(p, ['run']))
  const earlyRunRate = earlyDown.length ? Math.round((earlyRun.length / earlyDown.length) * 100) : 0
  const thirdMedium = plays.filter((p) => p.down === 3 && (p.distance || 0) >= 4 && (p.distance || 0) <= 7)
  const thirdPass = thirdMedium.filter((p) => includesAny(p, ['pass']))
  const thirdPassRate = thirdMedium.length ? Math.round((thirdPass.length / thirdMedium.length) * 100) : 0

  const topFormation = topValue(plays.map((p) => p.formation))
  const topPersonnel = topValue(plays.map((p) => p.personnel))
  const topPlayFamily = topValue(plays.map((p) => p.play_family))
  const blitzPlays = plays.filter((p) => includesAny(p, ['blitz', 'pressure']))
  const blitzRate = Math.round((blitzPlays.length / safeTotal) * 100)

  const coverageTags = plays.filter((p) => includesAny(p, ['cover', 'quarters', 'cloud', 'trap']))
  const coverageRate = Math.round((coverageTags.length / safeTotal) * 100)

  const stDirectionalLeft = plays.filter((p) => includesAny(p, ['left', 'boundary', 'field']))
  const stDirectionalRight = plays.filter((p) => includesAny(p, ['right']))
  const stMiddle = plays.filter((p) => includesAny(p, ['middle', 'center']))
  const stTotalDirectional = stDirectionalLeft.length + stDirectionalRight.length + stMiddle.length || 1
  const stSplit = `${Math.round((stDirectionalLeft.length / stTotalDirectional) * 100)}% left/field | ${Math.round(
    (stDirectionalRight.length / stTotalDirectional) * 100
  )}% right | ${Math.round((stMiddle.length / stTotalDirectional) * 100)}% middle`

  const split =
    label === 'Offense'
      ? `${runRate}% run | ${passRate}% pass`
      : label === 'Defense'
      ? `${blitzRate}% pressure | ${coverageRate}% coverage tags`
      : stSplit

  const callouts: string[] = []
  if (label === 'Offense') {
    if (earlyDown.length) callouts.push(`Early downs: ${earlyRunRate}% run`)
    if (thirdMedium.length) callouts.push(`3rd & medium: ${thirdPassRate}% pass`)
    if (topFormation) callouts.push(`Top formation: ${topFormation}`)
    if (topPersonnel) callouts.push(`Top personnel: ${topPersonnel}`)
  } else if (label === 'Defense') {
    if (blitzPlays.length) callouts.push(`Pressure rate: ${blitzRate}%`)
    if (topPlayFamily) callouts.push(`Common look: ${topPlayFamily}`)
    if (coverageTags.length) callouts.push(`Coverage tags on ${coverageRate}% of snaps`)
    if (lateDown.length) {
      const latePressure = lateDown.filter((p) => includesAny(p, ['blitz', 'pressure']))
      const latePressureRate = Math.round((latePressure.length / lateDown.length) * 100)
      callouts.push(`Late downs: ${latePressureRate}% pressure`)
    }
  } else if (label === 'Special teams') {
    if (topPlayFamily) callouts.push(`Top call: ${topPlayFamily}`)
    if (stDirectionalLeft.length + stDirectionalRight.length + stMiddle.length) callouts.push('Directional tend: see split')
  }

  const hasData = total > 0 && callouts.length > 0
  if (!hasData) {
    callouts.push(`Upload or select scouting CSVs for ${opponent || 'this opponent'} ${season || ''}`.trim())
  }

  return {
    label,
    headline: hasData ? callouts[0] : 'Scouting data needed',
    callouts,
    split,
    cta,
    href: '#workspace',
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






