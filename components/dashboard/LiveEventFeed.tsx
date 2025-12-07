'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ActivitySquare, Flame, RadioTower, ShieldAlert } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/utils/supabase/browser'
import { EventSummary } from '@/app/(app)/dashboard/types'
import { formatEventTimestamp, formatUnitLabel, normalizeEventSession } from '@/app/(app)/dashboard/utils'

type LiveEventFeedProps = {
  teamId: string
  initialEvents: EventSummary[]
  onNewEvent?: (event: EventSummary) => void
}

export function LiveEventFeed({ teamId, initialEvents, onNewEvent }: LiveEventFeedProps) {
  const [events, setEvents] = useState<EventSummary[]>(initialEvents)
  const [unavailable, setUnavailable] = useState(false)
  const [unitFilter, setUnitFilter] = useState<'ALL' | 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS'>('ALL')

  useEffect(() => {
    let isMounted = true
    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null
    try {
      supabase = createSupabaseBrowserClient()
    } catch (err) {
      console.warn('Live event feed unavailable: Supabase not configured', err)
      setTimeout(() => setUnavailable(true), 0)
      return
    }

    const channel = supabase
      .channel(`dashboard-feed-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chart_events',
          filter: `team_id=eq.${teamId}`,
        },
        async (payload) => {
          if (!payload.new) return
          const incoming = payload.new as EventSummary

          let hydratedEvent: EventSummary = {
            id: incoming.id,
            sequence: incoming.sequence,
            play_call: incoming.play_call,
            result: incoming.result,
            gained_yards: incoming.gained_yards,
            explosive: incoming.explosive,
            turnover: incoming.turnover,
            created_at: incoming.created_at,
            game_sessions: normalizeEventSession(
              (incoming as Partial<EventSummary> | null)?.game_sessions ?? null
            ),
          }

          try {
            const { data } = await supabase
              .from('chart_events')
              .select(
                'id, sequence, play_call, result, gained_yards, explosive, turnover, created_at, game_sessions!inner(unit, game_id)'
              )
              .eq('id', incoming.id)
              .maybeSingle()

            if (data) {
              hydratedEvent = {
                ...data,
                game_sessions: normalizeEventSession(data.game_sessions),
              }
            }
          } catch (err) {
            console.warn('LiveEventFeed hydration failed', err)
          }

          if (!isMounted) return

          setEvents((prev) => {
            if (prev.some((item) => item.id === hydratedEvent.id)) return prev
            return [hydratedEvent, ...prev].slice(0, 30)
          })
          onNewEvent?.(hydratedEvent)
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase?.removeChannel(channel)
    }
  }, [teamId, onNewEvent])

  const filteredEvents = useMemo(() => {
    if (unitFilter === 'ALL') return events
    return events.filter((event) => (event.game_sessions?.unit || '').toUpperCase() === unitFilter)
  }, [events, unitFilter])

  if (unavailable) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-950/60 to-black/60 p-6 shadow-[0_25px_70px_-35px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Live event feed</h2>
            <p className="text-sm text-slate-400">
              Supabase is not configured; live feed is unavailable in this environment.
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
            <RadioTower className="h-5 w-5" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-950/60 to-black/60 p-6 shadow-[0_25px_70px_-35px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-100">Live event feed</h2>
          <p className="text-sm text-slate-400">Latest charted plays stream in real time.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase tracking-[0.18em] text-slate-400">Unit</label>
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value as typeof unitFilter)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-100"
          >
            <option value="ALL">All</option>
            <option value="OFFENSE">Offense</option>
            <option value="DEFENSE">Defense</option>
            <option value="SPECIAL_TEAMS">Special Teams</option>
          </select>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
            <RadioTower className="h-5 w-5" />
          </div>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-slate-400">
          <ActivitySquare className="mb-3 h-10 w-10 text-slate-500" />
          <p className="text-sm">No plays match this filter. Start a session in Games to see the live feed.</p>
        </div>
      ) : (
        <div className="mt-5 max-h-[460px] space-y-3 overflow-y-auto pr-1" role="list" aria-live="polite">
          <AnimatePresence initial={false}>
            {filteredEvents.map((event) => (
              <motion.article
                key={event.id}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 shadow-lg backdrop-blur hover:border-cyan-400/30"
                role="listitem"
                aria-label={`Unit ${formatUnitLabel(event.game_sessions?.unit)} sequence ${event.sequence}`}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent opacity-70" />
                <div className="relative flex flex-wrap items-center justify-between gap-2 text-[0.7rem] uppercase tracking-[0.24em] text-slate-400">
                  <span>{formatUnitLabel(event.game_sessions?.unit)}</span>
                  <span className="tabular-nums">{formatEventTimestamp(event.created_at)}</span>
                </div>
                <div className="relative mt-1 flex flex-wrap items-center gap-2 text-base font-semibold text-slate-100">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.7rem] uppercase tracking-[0.24em] text-cyan-200">
                    {event.result || 'Result TBD'}
                  </span>
                  <span className="truncate break-words max-w-full">{event.play_call || 'Play call TBD'}</span>
                </div>
                <div className="relative mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-slate-800/70 px-2 py-1 tabular-nums">
                    Yardage: {typeof event.gained_yards === 'number' ? event.gained_yards : '--'}
                  </span>
                  {event.explosive && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-amber-200">
                      <Flame className="h-3.5 w-3.5" /> Explosive
                    </span>
                  )}
                  {event.turnover && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-rose-200">
                      <ShieldAlert className="h-3.5 w-3.5" /> Turnover
                    </span>
                  )}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
