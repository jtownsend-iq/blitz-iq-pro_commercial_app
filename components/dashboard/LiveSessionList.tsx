'use client'

import Link from 'next/link'
import { ArrowUpRight, Clock3, Radio, Satellite, ShieldCheck } from 'lucide-react'
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
          <CardTitle>Live sessions</CardTitle>
          <CardDescription>Jump into active charting or review recent sessions.</CardDescription>
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
          {sorted.map((session, idx) => {
            const status = (session.status || '').toLowerCase()
            const ctaLabel =
              status === 'active' || status === 'pending'
                ? 'Resume'
                : status === 'closed' || status === 'final'
                ? 'View'
                : 'Open'
            return (
            <article
              key={session.id}
              role="listitem"
              className={`group relative overflow-hidden rounded-2xl border border-white/10 p-4 transition hover:-translate-y-[1px] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 ${
                idx % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-950/50'
              }`}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-transparent opacity-0 blur-2xl transition duration-500 group-hover:opacity-100" />
                <div className="relative flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-100">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(52,211,153,0.15)]" />
                      {session.status}
                    </span>
                    <span className="text-slate-500">{formatUnitLabel(session.unit)}</span>
                    </div>
                  <div className="text-sm font-semibold text-slate-100 line-clamp-1 break-words">
                    {session.games?.opponent_name ? `vs ${session.games.opponent_name}` : 'Session'}
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-1 break-words">
                    {formatDateShort(session.games?.start_time ?? null)}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-1 break-words">
                    Started {formatRelativeTime(session.started_at)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-[0.78rem] text-slate-200">
                    <Clock3 className="h-4 w-4 text-slate-500" />
                    {formatRelativeTime(session.started_at)} ago
                  </div>
                  <Link
                    href={`/games/${session.game_id}/chart/${(session.unit || '').toLowerCase().replace('_', '-')}`}
                    className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-black shadow-[0_14px_36px_-18px_rgba(0,229,255,0.55)] transition hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    {ctaLabel}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                  <div className="flex items-center gap-2 text-[0.8rem] text-slate-400">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    {status || 'Idle'}
                  </div>
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
