import { createHash } from 'crypto'
import { parse as parseCsv } from 'csv-parse/sync'

type BaseContext = {
  teamId: string
  opponent: string
  season: string
  defaultPhase?: 'OFFENSE' | 'DEFENSE'
}

type NormalizedRow = {
  phase: 'OFFENSE' | 'DEFENSE'
  down: number | null
  distance: number | null
  hash: string | null
  field_position: number | null
  quarter: number | null
  time_remaining_seconds: number | null
  formation: string | null
  personnel: string | null
  front: string | null
  coverage: string | null
  pressure: string | null
  play_family: string | null
  result: string | null
  gained_yards: number | null
  explosive: boolean
  turnover: boolean
  tags: string[]
}

const MAX_LEN = 120
const MAX_TAGS = 20
const MAX_TAG_LEN = 50
const MIN_GAINS = -50
const MAX_GAINS = 150

const normalizeString = (value: unknown, max = MAX_LEN) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > max) return trimmed.slice(0, max)
  return trimmed
}

const normalizeTags = (value: unknown, errors: string[]) => {
  if (value === undefined || value === null) return [] as string[]
  const raw =
    typeof value === 'string'
      ? value
      : Array.isArray(value)
        ? value.join(',')
        : ''
  const parts = raw
    .split(/[,|]/)
    .map((p) => p.toLowerCase().trim())
    .filter(Boolean)
  const unique = Array.from(new Set(parts))
  if (unique.length > MAX_TAGS) {
    errors.push(`Too many tags; max ${MAX_TAGS}`)
  }
  const capped = unique.slice(0, MAX_TAGS).filter((t) => {
    if (t.length > MAX_TAG_LEN) {
      errors.push(`Tag "${t.slice(0, MAX_TAG_LEN)}" exceeds ${MAX_TAG_LEN} chars`)
      return false
    }
    return true
  })
  return capped
}

const parseBool = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    return v === 'true' || v === '1' || v === 'yes' || v === 'y'
  }
  if (typeof value === 'number') return value === 1
  return false
}

const parseIntBounded = (value: unknown, min: number, max: number, errors: string[], label: string) => {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) {
    errors.push(`${label} must be a number`)
    return null
  }
  const intVal = Math.trunc(n)
  if (intVal < min || intVal > max) {
    errors.push(`${label} must be between ${min} and ${max}`)
    return null
  }
  return intVal
}

export function hashBuffer(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex')
}

export function parseCsvRows(buffer: Buffer) {
  return parseCsv(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[]
}

export function normalizeRow(
  raw: Record<string, unknown>,
  ctx: BaseContext
): { normalized: NormalizedRow; errors: string[] } {
  const errors: string[] = []

  // Normalize keys case-insensitively
  const lookup = (key: string) => {
    const entry = Object.entries(raw).find(([k]) => k.toLowerCase() === key.toLowerCase())
    return entry ? entry[1] : undefined
  }

  const phaseRaw = (lookup('phase') as string | undefined)?.toUpperCase() || ctx.defaultPhase || 'OFFENSE'
  const phase = phaseRaw === 'DEFENSE' ? 'DEFENSE' : 'OFFENSE'
  if (phaseRaw !== 'OFFENSE' && phaseRaw !== 'DEFENSE') {
    errors.push('phase must be OFFENSE or DEFENSE; defaulted to OFFENSE')
  }

  const normalized: NormalizedRow = {
    phase,
    down: parseIntBounded(lookup('down'), 1, 4, errors, 'down'),
    distance: parseIntBounded(lookup('distance'), 0, 30, errors, 'distance'),
    hash: normalizeString(lookup('hash')),
    field_position: parseIntBounded(lookup('field_position'), 0, 100, errors, 'field_position'),
    quarter: parseIntBounded(lookup('quarter'), 1, 5, errors, 'quarter'),
    time_remaining_seconds: parseIntBounded(
      lookup('time_remaining_seconds'),
      0,
      3600,
      errors,
      'time_remaining_seconds'
    ),
    formation: normalizeString(lookup('formation')),
    personnel: normalizeString(lookup('personnel')),
    front: normalizeString(lookup('front')),
    coverage: normalizeString(lookup('coverage')),
    pressure: normalizeString(lookup('pressure')),
    play_family: normalizeString(lookup('play_family')),
    result: normalizeString(lookup('result')),
    gained_yards: parseIntBounded(lookup('gained_yards'), MIN_GAINS, MAX_GAINS, errors, 'gained_yards'),
    explosive: parseBool(lookup('explosive')),
    turnover: parseBool(lookup('turnover')),
    tags: normalizeTags(lookup('tags'), errors),
  }

  return { normalized, errors }
}
