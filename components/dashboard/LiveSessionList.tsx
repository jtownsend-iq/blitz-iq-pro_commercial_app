'use client'

import Link from 'next/link'
import { ArrowUpRight, Clock3, Radio, Satellite, ShieldCheck } from 'lucide-react'
import { SessionSummary } from '@/app/(app)/dashboard/types'
import { formatDateShort, formatRelativeTime, formatUnitLabel } from '@/app/(app)/dashboard/utils'

type LiveSessionListProps = {
  sessions: SessionSummary[]
}

export function LiveSessionList({ sessions }: LiveSessionListProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-950/60 to-black/60 p-6 shadow-[0_25px_70px_-35px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Live sessions</h2>
          <p className="text-sm text-slate-400">Jump into active charting or review recent sessions.</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
          <Radio className="h-5 w-5" />
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-slate-400">
          <Satellite className="mb-3 h-10 w-10 text-slate-500" />
          <p className="text-sm">No sessions yet. Start offense, defense, or special teams from Games.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {sessions.map((session, idx) => (
            <article
              key={session.id}
              className={`group relative overflow-hidden rounded-2xl border border-white/10 p-4 transition hover:-translate-y-[1px] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 ${
                idx % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-950/50'
              }`}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-transparent opacity-0 blur-2xl transition duration-500 group-hover:opacity-100" />
              <div className="relative flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Unit</p>
                  <p className="text-base font-semibold text-slate-100">{formatUnitLabel(session.unit)}</p>
                  <p className="text-xs text-slate-500">
                    vs {session.games?.opponent_name || 'Opponent TBD'} |{' '}
                    {formatDateShort(session.games?.start_time ?? null)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] uppercase tracking-[0.24em] ${
                    session.status === 'active'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-slate-700 bg-slate-800/70 text-slate-300'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {session.status}
                </span>
              </div>
              <div className="relative mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-slate-300 backdrop-blur">
                  <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                  Started {formatRelativeTime(session.started_at)}
                </div>
                <Link
                  href={`/games/${session.game_id}/chart/${(session.unit || '').toLowerCase().replace('_', '-')}`}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100 transition hover:border-emerald-400/50 hover:text-white"
                >
                  Open chart <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
