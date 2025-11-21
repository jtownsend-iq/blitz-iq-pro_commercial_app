// Centralized timezone defaults and helpers. Keep the database on UTC and render in the user's/tenant's zone.
export const DEFAULT_TIMEZONE = 'US/Central'

/**
 * Resolve a safe timezone string, falling back to the app default.
 * Pass in a per-tenant or per-user preference if available.
 */
export function resolveTimezone(preferred?: string | null): string {
  const tz = typeof preferred === 'string' ? preferred.trim() : ''
  return tz.length > 0 ? tz : DEFAULT_TIMEZONE
}
