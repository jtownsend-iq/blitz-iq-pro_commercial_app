import { resolveTimezone } from './timezone'

type DateInput = string | number | Date

/**
 * Format a date in the user's/tenant's timezone while keeping storage in UTC.
 * Falls back to the app default when a preferred zone is not provided.
 */
export function formatDate(
  value: DateInput,
  preferredTimezone?: string | null,
  locale: string = 'en-US'
): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleDateString(locale, {
    timeZone: resolveTimezone(preferredTimezone),
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
