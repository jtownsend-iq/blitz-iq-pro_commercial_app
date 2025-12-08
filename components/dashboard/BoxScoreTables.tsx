import { BoxScoreReport } from '@/utils/stats/types'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { StatBadge } from '@/components/ui/StatBadge'

type TableRow = {
  key: string
  cells: Array<string | number>
  emphasis?: boolean
}

function formatRate(numerator: number, denominator: number, digits = 0) {
  if (!denominator) return '--'
  const pct = ((numerator / denominator) * 100).toFixed(digits)
  return `${numerator}/${denominator} (${pct}%)`
}

function formatClock(seconds: number | null | undefined) {
  if (seconds == null) return '--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function BoxTable({ title, columns, rows }: { title: string; columns: string[]; rows: TableRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-slate-100">{title}</h4>
        <Pill label={`${rows.length} rows`} tone="slate" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-900/60 bg-slate-900/40">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className={`border-t border-slate-900/60 ${row.emphasis ? 'bg-slate-900/30 font-semibold text-slate-50' : 'text-slate-100'}`}
              >
                {row.cells.map((cell, idx) => (
                  <td key={idx} className="whitespace-nowrap px-3 py-2">
                    {typeof cell === 'number' && !Number.isFinite(cell) ? '--' : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function BoxScoreTables({ boxScore, teamLabel = 'Team' }: { boxScore: BoxScoreReport; teamLabel?: string }) {
  const fd = boxScore.team.firstDowns
  const turnovers = boxScore.team.turnovers
  const teamSummaryBadges = [
    { label: 'Total yards', value: `${boxScore.team.totalYards} on ${boxScore.team.plays} plays`, tone: 'emerald' as const },
    { label: 'Yards per play', value: boxScore.team.yardsPerPlay.toFixed(1), tone: 'cyan' as const },
    { label: 'Passing', value: `${boxScore.team.passingYards} yds`, tone: 'slate' as const },
    { label: 'Rushing', value: `${boxScore.team.rushingYards} yds`, tone: 'slate' as const },
    { label: 'First downs', value: `${fd.total} (R${fd.rushing}/P${fd.passing}/Pen${fd.penalty})`, tone: 'emerald' as const },
    {
      label: '3rd down',
      value: formatRate(boxScore.team.thirdDown.conversions, boxScore.team.thirdDown.attempts),
      tone: 'cyan' as const,
    },
    {
      label: '4th down',
      value: formatRate(boxScore.team.fourthDown.conversions, boxScore.team.fourthDown.attempts),
      tone: 'cyan' as const,
    },
    {
      label: 'Turnovers',
      value: `${turnovers.total} (INT ${turnovers.interceptions}, FUM ${turnovers.fumblesLost})`,
      tone: 'amber' as const,
    },
    {
      label: 'Penalties',
      value: `${boxScore.team.penalties.count} for ${boxScore.team.penalties.yards} yds`,
      tone: 'slate' as const,
    },
    {
      label: 'Red zone',
      value: boxScore.team.redZone.trips
        ? `${boxScore.team.redZone.scores}/${boxScore.team.redZone.trips} (${boxScore.team.redZone.touchdowns} TD)`
        : '--',
      tone: 'emerald' as const,
    },
    { label: 'Time of possession', value: formatClock(boxScore.team.timeOfPossessionSeconds), tone: 'slate' as const },
  ]

  const passingRows: TableRow[] = [
    {
      key: 'team',
      emphasis: true,
      cells: [
        teamLabel,
        `${boxScore.passing.team.completions}/${boxScore.passing.team.attempts}`,
        boxScore.passing.team.yards,
        boxScore.passing.team.touchdowns,
        boxScore.passing.team.interceptions,
        boxScore.passing.team.sacks,
        boxScore.passing.team.sackYards,
        boxScore.passing.team.yardsPerAttempt.toFixed(1),
        boxScore.passing.team.longest,
        boxScore.passing.team.passerRating.toFixed(1),
        boxScore.passing.team.qbr?.toFixed(1) ?? '--',
      ],
    },
    ...Object.entries(boxScore.passing.players)
      .sort(([, a], [, b]) => b.attempts - a.attempts)
      .map(([player, line]) => ({
        key: player,
        cells: [
          player,
          `${line.completions}/${line.attempts}`,
          line.yards,
          line.touchdowns,
          line.interceptions,
          line.sacks,
          line.sackYards,
          line.yardsPerAttempt.toFixed(1),
          line.longest,
          line.passerRating.toFixed(1),
          line.qbr?.toFixed(1) ?? '--',
        ],
      })),
  ]

  const rushingRows: TableRow[] = [
    {
      key: 'team',
      emphasis: true,
      cells: [
        teamLabel,
        boxScore.rushing.team.attempts,
        boxScore.rushing.team.yards,
        boxScore.rushing.team.yardsPerCarry.toFixed(1),
        boxScore.rushing.team.touchdowns,
        boxScore.rushing.team.longest,
        boxScore.rushing.team.fumbles,
        boxScore.rushing.team.fumblesLost,
      ],
    },
    ...Object.entries(boxScore.rushing.players)
      .sort(([, a], [, b]) => b.attempts - a.attempts)
      .map(([player, line]) => ({
        key: player,
        cells: [
          player,
          line.attempts,
          line.yards,
          line.yardsPerCarry.toFixed(1),
          line.touchdowns,
          line.longest,
          line.fumbles,
          line.fumblesLost,
        ],
      })),
  ]

  const receivingRows: TableRow[] = [
    {
      key: 'team',
      emphasis: true,
      cells: [
        teamLabel,
        boxScore.receiving.team.targets,
        boxScore.receiving.team.receptions,
        boxScore.receiving.team.yards,
        boxScore.receiving.team.yardsPerReception.toFixed(1),
        boxScore.receiving.team.yardsAfterCatch,
        boxScore.receiving.team.touchdowns,
        boxScore.receiving.team.longest,
      ],
    },
    ...Object.entries(boxScore.receiving.players)
      .sort(([, a], [, b]) => b.targets - a.targets)
      .map(([player, line]) => ({
        key: player,
        cells: [
          player,
          line.targets,
          line.receptions,
          line.yards,
          line.yardsPerReception.toFixed(1),
          line.yardsAfterCatch,
          line.touchdowns,
          line.longest,
        ],
      })),
  ]

  const defenseRows: TableRow[] = [
    {
      key: 'team',
      emphasis: true,
      cells: [
        teamLabel,
        boxScore.defense.team.total.toFixed(1),
        boxScore.defense.team.solo.toFixed(1),
        boxScore.defense.team.assisted.toFixed(1),
        boxScore.defense.team.sacks.toFixed(1),
        boxScore.defense.team.tfl.toFixed(1),
        boxScore.defense.team.passesDefended.toFixed(1),
        boxScore.defense.team.interceptions.toFixed(1),
        boxScore.defense.team.forcedFumbles.toFixed(1),
        boxScore.defense.team.fumbleRecoveries.toFixed(1),
      ],
    },
    ...Object.entries(boxScore.defense.players)
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([player, line]) => ({
        key: player,
        cells: [
          player,
          line.total.toFixed(1),
          line.solo.toFixed(1),
          line.assisted.toFixed(1),
          line.sacks.toFixed(1),
          line.tfl.toFixed(1),
          line.passesDefended.toFixed(1),
          line.interceptions.toFixed(1),
          line.forcedFumbles.toFixed(1),
          line.fumbleRecoveries.toFixed(1),
        ],
      })),
  ]

  const kickingRows: TableRow[] = [
    {
      key: 'team',
      emphasis: true,
      cells: [
        teamLabel,
        formatRate(boxScore.kicking.team.fgMade, boxScore.kicking.team.fgAtt),
        boxScore.kicking.team.fgPct ? (boxScore.kicking.team.fgPct * 100).toFixed(0) + '%' : '0%',
        formatRate(boxScore.kicking.team.extraMade, boxScore.kicking.team.extraAtt),
        boxScore.kicking.team.extraPct ? (boxScore.kicking.team.extraPct * 100).toFixed(0) + '%' : '0%',
        boxScore.kicking.team.longestFg,
        boxScore.kicking.team.points,
      ],
    },
    ...Object.entries(boxScore.kicking.players)
      .sort(([, a], [, b]) => b.fgAtt - a.fgAtt)
      .map(([player, line]) => ({
        key: player,
        cells: [
          player,
          formatRate(line.fgMade, line.fgAtt),
          line.fgPct ? (line.fgPct * 100).toFixed(0) + '%' : '0%',
          formatRate(line.extraMade, line.extraAtt),
          line.extraPct ? (line.extraPct * 100).toFixed(0) + '%' : '0%',
          line.longestFg,
          line.points,
        ],
      })),
  ]

  const puntingRows: TableRow[] = [
    {
      key: 'team',
      emphasis: true,
      cells: [
        teamLabel,
        boxScore.punting.team.punts,
        boxScore.punting.team.yards,
        boxScore.punting.team.gross.toFixed(1),
        boxScore.punting.team.net.toFixed(1),
        boxScore.punting.team.touchbacks,
        boxScore.punting.team.inside20,
        boxScore.punting.team.longest,
      ],
    },
    ...Object.entries(boxScore.punting.players)
      .sort(([, a], [, b]) => b.punts - a.punts)
      .map(([player, line]) => ({
        key: player,
        cells: [
          player,
          line.punts,
          line.yards,
          line.gross.toFixed(1),
          line.net.toFixed(1),
          line.touchbacks,
          line.inside20,
          line.longest,
        ],
      })),
  ]

  const kickoffReturnRows: TableRow[] = [
    {
      key: 'team',
      emphasis: true,
      cells: [
        teamLabel,
        boxScore.returns.kickoff.team.returns,
        boxScore.returns.kickoff.team.yards,
        boxScore.returns.kickoff.team.average.toFixed(1),
        boxScore.returns.kickoff.team.longest,
        boxScore.returns.kickoff.team.touchdowns,
      ],
    },
    ...Object.entries(boxScore.returns.kickoff.byReturner || {})
      .sort(([, a], [, b]) => b.returns - a.returns)
      .map(([player, line]) => ({
        key: player,
        cells: [player, line.returns, line.yards, line.average.toFixed(1), line.longest, line.touchdowns],
      })),
  ]

  const puntReturnRows: TableRow[] = [
    {
      key: 'team',
      emphasis: true,
      cells: [
        teamLabel,
        boxScore.returns.punt.team.returns,
        boxScore.returns.punt.team.yards,
        boxScore.returns.punt.team.average.toFixed(1),
        boxScore.returns.punt.team.longest,
        boxScore.returns.punt.team.touchdowns,
      ],
    },
    ...Object.entries(boxScore.returns.punt.byReturner || {})
      .sort(([, a], [, b]) => b.returns - a.returns)
      .map(([player, line]) => ({
        key: player,
        cells: [player, line.returns, line.yards, line.average.toFixed(1), line.longest, line.touchdowns],
      })),
  ]

  return (
    <div className="space-y-6">
      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Team box score</h3>
          <Pill label={teamLabel} tone="emerald" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teamSummaryBadges.map((badge) => (
            <StatBadge key={badge.label} label={badge.label} value={badge.value} tone={badge.tone} />
          ))}
        </div>
      </GlassCard>

      <GlassCard className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Offense</h3>
            <p className="text-sm text-slate-300">Live drive-level output backed by the box score engine.</p>
          </div>
          <Pill label="Passing / Rushing / Receiving" tone="cyan" />
        </div>
        <BoxTable
          title="Passing"
          columns={['Player', 'C/A', 'Yds', 'TD', 'INT', 'Sacks', 'Sack Yds', 'Y/A', 'Long', 'Rating', 'QBR']}
          rows={passingRows}
        />
        <BoxTable title="Rushing" columns={['Player', 'Carries', 'Yds', 'Avg', 'TD', 'Long', 'FUM', 'Lost']} rows={rushingRows} />
        <BoxTable
          title="Receiving"
          columns={['Player', 'Tgt', 'Rec', 'Yds', 'Avg', 'YAC', 'TD', 'Long']}
          rows={receivingRows}
        />
      </GlassCard>

      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Defense</h3>
            <p className="text-sm text-slate-300">Solo, assisted, sacks, takeaways, and havoc contributions.</p>
          </div>
          <Pill label="Defense" tone="emerald" />
        </div>
        <BoxTable
          title="Defensive production"
          columns={['Player', 'TOT', 'Solo', 'Ast', 'Sacks', 'TFL', 'PD', 'INT', 'FF', 'FR']}
          rows={defenseRows}
        />
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">Kicking</h3>
            <Pill label="FG / PAT" tone="cyan" />
          </div>
          <BoxTable title="Field goals & PAT" columns={['Player', 'FG', 'FG %', 'XP', 'XP %', 'Long', 'Pts']} rows={kickingRows} />
        </GlassCard>
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">Punting</h3>
            <Pill label="Field position" tone="slate" />
          </div>
          <BoxTable title="Punting" columns={['Player', 'Punts', 'Yds', 'Avg', 'Net', 'TB', 'In20', 'Long']} rows={puntingRows} />
        </GlassCard>
      </div>

      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Returns</h3>
          <Pill label="Kick & Punt" tone="cyan" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <BoxTable
            title="Kickoff returns"
            columns={['Player', 'Ret', 'Yds', 'Avg', 'Long', 'TD']}
            rows={kickoffReturnRows}
          />
          <BoxTable title="Punt returns" columns={['Player', 'Ret', 'Yds', 'Avg', 'Long', 'TD']} rows={puntReturnRows} />
        </div>
      </GlassCard>
    </div>
  )
}
