'use client'

import Link from 'next/link'
import { ArrowUpRight, Clock3, MapPin, Radio, Satellite, ShieldCheck } from 'lucide-react'
import { SessionSummary } from '@/app/(app)/dashboard/types'
import { formatDateShort, formatRelativeTime, formatUnitLabel } from '@/app/(app)/dashboard/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

type LiveSessionListProps = {
  sessions: SessionSummary[]
}

export function LiveSessionList({ sessions }: LiveSessionListProps) {
  const sorted = [...sessions].sort((a, b) => {
    const pri = (status: string | null | undefined) => {
      const val = (status || '').toLowerCase()
      if (val === 'active') return 0
      if (val === 'pending') return 1
      if (val === 'closed' || val === 'final') return 2
      return 3
    }
    return pri(a.status) - pri(b.status)
  })

  return (
    <Card padding="lg">
      <CardHeader>
        <div>
          <CardTitle>Game & scrimmage sessions</CardTitle>
          <CardDescription>Kickoff, location, and a single primary action per matchup.</CardDescription>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
          <Radio className="h-5 w-5" />
        </div>
      </CardHeader>

      {sessions.length === 0 ? (
        <CardContent>
          <EmptyState
            icon={<Satellite className="h-10 w-10 text-slate-500" />}
            title="No sessions yet"
            description="Start offense, defense, or special teams from Games."
          />
        </CardContent>
      ) : (
        <CardContent className="space-y-3" role="list">
          {sorted.map((session) => {
            const status = (session.status || '').toLowerCase()
            const ctaLabel =
              status === 'active' || status === 'pending'
                ? 'Resume'
                : status === 'closed' || status === 'final'
                ? 'View'
                : 'Open'
            const kickoff = formatDateShort(session.games?.start_time ?? null)
            const location =
              session.games?.location && session.games?.home_or_away
                ? `${session.games.home_or_away === 'home' ? 'Home' : 'Away'} • ${session.games.location}`
                : session.games?.location || session.games?.home_or_away || 'Location TBD'

            return (
              <article
                key={session.id}
                role="listitem"
                className="group relative grid min-h-[110px] grid-cols-[1fr_auto] items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 transition hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-emerald-500/5 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
                <div className="relative space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
                        status === 'active'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                          : 'border-slate-700 bg-slate-900/70 text-slate-300'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current" />
                      {session.status}
                    </span>
                    <span className="text-slate-400">{formatUnitLabel(session.unit)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-50 line-clamp-1 wrap-break-word">
                        {session.games?.opponent_name ? `vs ${session.games.opponent_name}` : 'Session'}
                      </p>
                      <p className="text-sm text-slate-400 line-clamp-1 wrap-break-word">{kickoff}</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      <MapPin className="h-4 w-4 text-slate-500" />
                      <span className="line-clamp-1 wrap-break-word">{location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock3 className="h-4 w-4 text-slate-500" />
                    Started {formatRelativeTime(session.started_at)}
                  </div>
                </div>

                <div className="relative flex flex-col items-end gap-2 text-right">
                  <Link
                    href={`/games/${session.game_id}/chart/${(session.unit || '').toLowerCase().replace('_', '-')}`}
                    className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-black shadow-[0_14px_36px_-18px_rgba(0,229,255,0.55)] transition hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    {ctaLabel}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.78rem] text-slate-200">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    {status || 'Idle'}
                  </div>
                </div>
              </article>
            )
          })}
        </CardContent>
      )}
    </Card>
  )
}
