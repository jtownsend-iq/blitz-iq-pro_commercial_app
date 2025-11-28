export type TelemetryPayload = Record<string, unknown>

// Simple in-memory rate limiter to avoid overwhelming the endpoint.
const rateWindowMs = 60_000
const rateLimit = 300
let rateWindowStart = Date.now()
let rateCount = 0

/**
 * Lightweight client-side telemetry sender using sendBeacon when available.
 * Falls back to a keepalive fetch to avoid blocking UI. Drops events if rate limit is exceeded.
 */
export function trackEvent(event: string, payload: TelemetryPayload = {}, source = 'app') {
  if (!event) return

  const now = Date.now()
  if (now - rateWindowStart > rateWindowMs) {
    rateWindowStart = now
    rateCount = 0
  }
  rateCount += 1
  if (rateCount > rateLimit) {
    return
  }

  try {
    const body = JSON.stringify({
      event,
      payload,
      source,
      ts: now,
    })
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/telemetry', blob)
    } else if (typeof fetch === 'function') {
      fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        // Intentionally swallow errors to avoid interrupting UX
      })
    }
  } catch (err) {
    // Ensure telemetry never throws to callers
    console.error('Telemetry error', err)
  }
}
