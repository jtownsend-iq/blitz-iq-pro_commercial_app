'use client'

import { useRouter } from 'next/navigation'
import {
  FormEvent,
  useCallback,
  useRef,
  useState,
  useTransition,
} from 'react'
import type { recordChartEvent } from '../../../chart-actions'
import { useChartRealtime } from './hooks/useChartRealtime'

type EventRow = {
  id: string
  sequence: number
  quarter: number | null
  clock_seconds: number | null
  down: number | null
  distance: number | null
  ball_on: string | null
  play_call: string | null
  result: string | null
  gained_yards: number | null
  created_at: string | null
}

type ChartEventPanelProps = {
  sessionId: string
  unitLabel: string
  initialEvents: EventRow[]
  nextSequence: number
  recordAction: typeof recordChartEvent
}

const quarterOptions = [1, 2, 3, 4]
const downOptions = [
  { value: '', label: 'Down' },
  { value: '1', label: '1st' },
  { value: '2', label: '2nd' },
  { value: '3', label: '3rd' },
  { value: '4', label: '4th' },
]

const hashOptions = [
  { value: '', label: 'Hash' },
  { value: 'LEFT', label: 'Left' },
  { value: 'MIDDLE', label: 'Middle' },
  { value: 'RIGHT', label: 'Right' },
]

const personnelOptions = ['10', '11', '12', '20', '21', '22', 'Heavy', 'Empty']
const coverageOptions = ['Cover 1', 'Cover 2', 'Cover 3', 'Quarters', 'Zero']
const frontOptions = ['Even', 'Odd', 'Bear', 'Mint', 'Tite']
const pressureOptions = ['None', 'Fire Zone', 'Single Edge', 'Double Edge']

const clockPattern = /^([0-5]?[0-9]):([0-5][0-9])$/

function formatClock(seconds: number | null) {
  if (seconds == null) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function mapError(code?: string) {
  if (!code) return 'Unable to record play. Please try again.'
  if (code === 'session_closed') return 'Session already closed. Return to games to reopen.'
  if (code === 'invalid_input') return 'Please check required fields (play call, clock format).'
  return 'Unable to record play. Please retry.'
}

function buildOptimisticEvent(formData: FormData, sequence: number): EventRow {
  const clock = formData.get('clock')?.toString()
  let clockSeconds: number | null = null
  if (clock && clockPattern.test(clock)) {
    const [, mm, ss] = clock.match(clockPattern)!
    clockSeconds = parseInt(mm, 10) * 60 + parseInt(ss, 10)
  }
  return {
    id: `optimistic-${sequence}-${Date.now()}`,
    sequence,
    quarter: formData.get('quarter') ? Number(formData.get('quarter')) : null,
    clock_seconds: clockSeconds,
    down: formData.get('down') ? Number(formData.get('down')) : null,
    distance: formData.get('distance') ? Number(formData.get('distance')) : null,
    ball_on: formData.get('ballOn')?.toString() || null,
    play_call: formData.get('playCall')?.toString() || null,
    result: formData.get('result')?.toString() || null,
    gained_yards: formData.get('gainedYards')
      ? Number(formData.get('gainedYards'))
      : null,
    created_at: new Date().toISOString(),
  }
}

function normalizeRealtimeEvent(payload: Record<string, unknown>): EventRow {
  return {
    id: (payload.id as string) ?? crypto.randomUUID(),
    sequence: Number(payload.sequence ?? 0),
    quarter: (payload.quarter as number) ?? null,
    clock_seconds: (payload.clock_seconds as number) ?? null,
    down: (payload.down as number) ?? null,
    distance: (payload.distance as number) ?? null,
    ball_on: (payload.ball_on as string) ?? null,
    play_call: (payload.play_call as string) ?? null,
    result: (payload.result as string) ?? null,
    gained_yards: (payload.gained_yards as number) ?? null,
    created_at: (payload.created_at as string) ?? null,
  }
}

export function ChartEventPanel({
  sessionId,
  unitLabel,
  initialEvents,
  nextSequence,
  recordAction,
}: ChartEventPanelProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [sequenceCounter, setSequenceCounter] = useState(nextSequence)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [events, setEvents] = useState<EventRow[]>(initialEvents)

  const upsertEvent = useCallback((newEvent: EventRow) => {
    setEvents((prev) => {
      const filtered = prev.filter((event) => event.id !== newEvent.id)
      return [newEvent, ...filtered].slice(0, 50)
    })
  }, [])

  useChartRealtime({
    sessionId,
    onEvent: (payload) => {
      upsertEvent(normalizeRealtimeEvent(payload))
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    formData.set('sessionId', sessionId)

    const playCall = formData.get('playCall')?.toString().trim()
    if (!playCall) {
      setErrorMessage('Play call is required.')
      return
    }

    const clock = formData.get('clock')?.toString()
    if (clock && !clockPattern.test(clock)) {
      setErrorMessage('Clock must be formatted MM:SS (e.g., 12:34).')
      return
    }

    const optimisticEvent = buildOptimisticEvent(formData, sequenceCounter)
    upsertEvent(optimisticEvent)
    setSequenceCounter((prev) => prev + 1)

    startTransition(async () => {
      const result = await recordAction(formData)
      if (!result.success) {
        setErrorMessage(mapError(result.error))
        router.refresh()
        return
      }

      setErrorMessage(null)
      form.reset()
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-slate-900/70 bg-black/30 p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Log a play</h2>
          <p className="text-sm text-slate-500">
            {unitLabel} analysts capture each snap. Required fields are minimal to keep pace.
          </p>
        </div>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Quarter</span>
              <select
                name="quarter"
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">—</option>
                {quarterOptions.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Clock (MM:SS)</span>
              <input
                name="clock"
                placeholder="12:34"
                pattern="[0-5]?[0-9]:[0-5][0-9]"
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Drive #</span>
              <input
                name="driveNumber"
                type="number"
                min={1}
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Down</span>
              <select
                name="down"
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              >
                {downOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Distance</span>
              <input
                name="distance"
                type="number"
                min={1}
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Ball on</span>
              <input
                name="ballOn"
                placeholder="O35"
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Hash</span>
              <select
                name="hashMark"
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              >
                {hashOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Offensive personnel</span>
              <input
                list="personnelOptions"
                name="offensivePersonnel"
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Defensive personnel</span>
              <input
                name="defensivePersonnel"
                placeholder="Nickel"
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Formation / Front</span>
              <input
                list="frontOptions"
                name="formation"
                placeholder="Trips Right / Even"
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Coverage / Pressure</span>
              <input
                list="coverageOptions"
                name="coverage"
                placeholder="Cover 6 / Fire Zone"
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Play call</span>
              <input
                name="playCall"
                placeholder="Trips Right 92 Mesh"
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
                required
              />
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Result</span>
              <input
                name="result"
                placeholder="Complete, +8"
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Yards gained</span>
              <input
                name="gainedYards"
                type="number"
                min={-99}
                max={99}
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <div className="flex items-center gap-6 pt-6 text-xs text-slate-400">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="explosive" value="true" className="accent-brand" />
                Explosive
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="turnover" value="true" className="accent-brand" />
                Turnover
              </label>
            </div>
          </div>

          <label className="space-y-1 text-xs text-slate-400 block">
            <span className="uppercase tracking-[0.2em]">Notes</span>
            <textarea
              name="notes"
              rows={3}
              className="w-full rounded-xl border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              placeholder="Coverage bust, pressure from boundary..."
            />
          </label>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-brand px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
            >
              {isPending ? 'Saving...' : 'Log play'}
            </button>
          </div>
        </form>

        <datalist id="personnelOptions">
          {personnelOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <datalist id="coverageOptions">
          {coverageOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <datalist id="frontOptions">
          {frontOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <datalist id="pressureOptions">
          {pressureOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>

      <div className="rounded-3xl border border-slate-900/70 bg-black/20 p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Recent plays</h2>
          <p className="text-sm text-slate-500">
            Shows the latest entries, including optimistic ones while the network request finishes.
          </p>
        </div>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {events.length === 0 ? (
            <p className="text-sm text-slate-500">
              No plays logged yet. Start charting to populate this list.
            </p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-slate-900/60 bg-slate-950/50 px-4 py-3 text-sm text-slate-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Seq {event.sequence} • Q{event.quarter || '—'} {formatClock(event.clock_seconds)}
                  </span>
                  <span>
                    Down/Dist:{' '}
                    {event.down ? `${event.down} & ${event.distance ?? '?'}` : '—'}
                  </span>
                </div>
                <div className="mt-1 font-semibold text-slate-100">
                  {event.play_call || 'Play call TBD'}
                </div>
                <div className="text-xs text-slate-400">
                  {event.result || 'Result TBD'} • Yardage:{' '}
                  {typeof event.gained_yards === 'number' ? `${event.gained_yards}` : '—'}
                </div>
                <div className="text-[0.7rem] text-slate-500">
                  Logged{' '}
                  {event.created_at
                    ? new Intl.DateTimeFormat('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      }).format(new Date(event.created_at))
                    : 'Pending...'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
