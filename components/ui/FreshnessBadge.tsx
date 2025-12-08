'use client'

import { useMemo, useState } from 'react'
import type { HTMLAttributes } from 'react'

export type FreshnessState = 'fresh' | 'stale' | 'offline'

type FreshnessBadgeProps = HTMLAttributes<HTMLDivElement> & {
  label?: string
  lastUpdated: string | null
  now?: number
}

export function computeFreshnessState(lastUpdated: string | null, now: number): FreshnessState {
  if (!lastUpdated) return 'offline'
  const ts = Date.parse(lastUpdated)
  if (Number.isNaN(ts)) return 'offline'
  const delta = now - ts
  if (delta <= 30_000) return 'fresh'
  if (delta <= 150_000) return 'stale'
  return 'offline'
}

function formatRelativeTime(value: string | null, now: number) {
  if (!value) return 'Awaiting sync'
  const ts = Date.parse(value)
  if (Number.isNaN(ts)) return 'Awaiting sync'
  const delta = now - ts
  if (delta < 1_000) return 'just now'
  const minutes = Math.floor(delta / 60_000)
  if (minutes === 0) return `${Math.floor(delta / 1_000)}s ago`
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function FreshnessBadge({ label = 'Data', lastUpdated, now, className, ...rest }: FreshnessBadgeProps) {
  const [initialNow] = useState(() => now ?? Date.now())
  const effectiveNow = useMemo(() => (typeof now === 'number' ? now : initialNow), [now, initialNow])
  const state = computeFreshnessState(lastUpdated, effectiveNow)
  const tone =
    state === 'fresh'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
      : state === 'stale'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
      : 'border-rose-500/40 bg-rose-500/10 text-rose-100'
  const dot =
    state === 'fresh'
      ? 'bg-emerald-400'
      : state === 'stale'
      ? 'bg-amber-400'
      : 'bg-rose-400'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${tone} ${className ?? ''}`}
      {...rest}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="font-semibold">{label}: {state}</span>
      <span className="text-[0.7rem] text-slate-200 normal-case">{formatRelativeTime(lastUpdated, effectiveNow)}</span>
    </div>
  )
}
