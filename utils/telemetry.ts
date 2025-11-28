export type TelemetryPayload = Record<string, unknown>

/**
 * Lightweight client-side telemetry sender using sendBeacon when available.
 * Falls back to a keepalive fetch to avoid blocking UI.
 */
export function trackEvent(event: string, payload: TelemetryPayload = {}, source = 'app') {
  if (!event) return
  try {
    const body = JSON.stringify({
      event,
      payload,
      source,
      ts: Date.now(),
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
