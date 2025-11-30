'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { recordChartEvent } from '../../../chart-actions'
import type {
  BackfieldFamily,
  BackfieldOption,
  DefenseStructure,
  OffenseFormation,
  WRConcept,
} from '@/lib/dictionaries/types'
import { validateChartEventInput } from '@/lib/validators/charting'
import { useChartRealtime } from './hooks/useChartRealtime'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { Pill } from '@/components/ui/Pill'

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
  play_family?: 'RUN' | 'PASS' | 'RPO' | 'SPECIAL_TEAMS' | null
  run_concept?: string | null
  wr_concept_id?: string | null
  st_play_type?: string | null
  st_variant?: string | null
  front_code?: string | null
  defensive_structure_id?: string | null
  coverage_shell_pre?: string | null
  coverage_shell_post?: string | null
  strength?: string | null
  drive_number?: number | null
  series_tag?: string | null
  explosive?: boolean | null
  turnover?: boolean | null
}

type ChartEventPanelProps = {
  sessionId: string
  gameId: string
  unitLabel: string
  unit: 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS'
  initialEvents: EventRow[]
  nextSequence: number
  recordAction: typeof recordChartEvent
  offenseFormations: OffenseFormation[]
  offensePersonnel: string[]
  backfieldOptions: BackfieldOption[]
  backfieldFamilies?: BackfieldFamily[]
  defenseStructures: DefenseStructure[]
  wrConcepts: WRConcept[]
}

export const EVENT_TYPES = ['Offense', 'Defense', 'Special Teams'] as const
export type EventType = (typeof EVENT_TYPES)[number]

type FieldConfig = {
  name: string
  label: string
  type: 'text' | 'select' | 'checkbox' | 'number'
  options?: string[]
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
const runConceptOptions = [
  'INSIDE_ZONE',
  'OUTSIDE_ZONE',
  'DUO',
  'POWER',
  'COUNTER',
  'TRAP',
  'ISO',
  'SWEEP',
  'TOSS',
  'DRAW',
  'QB_KEEP',
  'OTHER',
]
const passResultOptions = ['COMPLETE', 'INCOMPLETE', 'INT', 'SACK', 'THROWAWAY', 'SCREEN']
const stPlayTypes = ['KICKOFF', 'KICKOFF_RETURN', 'PUNT', 'PUNT_RETURN', 'FG', 'FG_BLOCK']
const stVariants = ['NORMAL', 'FAKE', 'ONSIDE', 'DIRECTIONAL', 'RUGBY', 'SKY']
const clockPattern = /^([0-5]?[0-9]):([0-5][0-9])$/
const quickGainOptions = [-5, -2, 0, 3, 6, 10, 15, 25]
const strengthOptions = ['TO_TE', 'TO_TRIPS', 'FIELD', 'BOUNDARY']
const prettifyLabel = (opt: string) =>
  opt
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')

const coverageShellOptions = [
  { value: 'ZERO_SHELL', label: '0 (No Deep)' },
  { value: 'ONE_HIGH', label: '1-High (Middle Closed)' },
  { value: 'ONE_HIGH_WEAK_ROT', label: '1-High - Weak Rotation Look' },
  { value: 'ONE_HIGH_STRONG_ROT', label: '1-High - Strong Rotation Look' },
  { value: 'TWO_HIGH', label: '2-High (Split Safety)' },
  { value: 'TWO_HIGH_QUARTERS_SHELL', label: '2-High Quarters Shell' },
  { value: 'TWO_HIGH_2READ_SHELL', label: '2-High 2-Read / Trap Shell' },
  { value: 'THREE_HIGH_DROP8', label: '3-High / Drop 8 Shell' },
  { value: 'ROBBER_LOOK', label: 'Robber Look (Safety Down in Box)' },
  { value: 'PRESSURE_ZERO_LOOK', label: 'Zero Pressure Look (All-Out Blitz Look)' },
  { value: 'DISGUISED_UNKNOWN', label: 'Disguised / Unknown Shell' },
]

const coveragePostOptions = [
  { value: 'C0', label: 'Cover 0' },
  { value: 'C0_PRESSURE', label: 'Cover 0 Pressure' },
  { value: 'C1', label: 'Cover 1' },
  { value: 'C1_ROBBER', label: 'Cover 1 Robber' },
  { value: 'C1_RAT', label: 'Cover 1 Rat' },
  { value: 'C1_DOUBLE', label: 'Cover 1 Double (Bracket X)' },
  { value: 'C2', label: 'Cover 2' },
  { value: 'C2_MAN', label: 'Cover 2 Man' },
  { value: 'C2_TAMPA', label: 'Tampa 2' },
  { value: 'C2_READ', label: '2-Read' },
  { value: 'C2_TRAP_CLOUD', label: '2-Trap / Cloud' },
  { value: 'C3', label: 'Cover 3' },
  { value: 'C3_MATCH', label: 'Cover 3 Match' },
  { value: 'C3_BUZZ', label: 'Cover 3 Buzz' },
  { value: 'C3_CLOUD', label: 'Cover 3 Cloud' },
  { value: 'C3_SKY', label: 'Cover 3 Sky' },
  { value: 'C3_FIRE_ZONE', label: 'Cover 3 Fire Zone' },
  { value: 'C4_QUARTERS', label: 'Cover 4 (Quarters)' },
  { value: 'C4_MATCH', label: 'Cover 4 Match' },
  { value: 'C4_PALMS', label: 'Quarters Palms' },
  { value: 'C4_MEG', label: 'Quarters MEG' },
  { value: 'C4_BRACKET', label: 'Quarters Bracket' },
  { value: 'C6', label: 'Cover 6 (Quarter-Quarter-Half)' },
  { value: 'C7', label: 'Cover 7 (Bracket Family)' },
  { value: 'DROP8_ZONE', label: 'Drop 8 Zone' },
  { value: 'EXOTIC_OTHER', label: 'Exotic / Other (Specify in Notes)' },
]

export const FIELD_CONFIG: Record<EventType, FieldConfig[]> = {
  Offense: [
    { name: 'offensive_personnel_code', label: 'Offensive Personnel', type: 'select' },
    { name: 'offensive_formation_id', label: 'Formation', type: 'select' },
    { name: 'backfield_code', label: 'Backfield', type: 'select' },
    { name: 'wr_concept_id', label: 'WR Concept', type: 'select' },
    { name: 'run_concept', label: 'Run Concept', type: 'select', options: runConceptOptions },
  ],
  Defense: [
    { name: 'front_code', label: 'Front', type: 'select' },
    { name: 'defensive_structure_id', label: 'Structure', type: 'select' },
    {
      name: 'coverage_shell_pre',
      label: 'Coverage (Pre)',
      type: 'select',
      options: coverageShellOptions.map((c) => c.value),
    },
    {
      name: 'coverage_shell_post',
      label: 'Coverage (Post)',
      type: 'select',
      options: coveragePostOptions.map((c) => c.value),
    },
  ],
  'Special Teams': [
    { name: 'st_play_type', label: 'ST Play Type', type: 'select', options: stPlayTypes },
    { name: 'st_variant', label: 'Variant', type: 'select', options: stVariants },
    { name: 'st_return_yards', label: 'Return Yards', type: 'number' },
  ],
}

function formatClock(seconds: number | null) {
  if (seconds == null) return '--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatYards(value: number | null | undefined) {
  if (value == null) return '--'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value}`
}

function isSuccessful(event: EventRow) {
  if (event.down == null || event.distance == null || event.gained_yards == null) return false
  if (event.down === 1) return event.gained_yards >= event.distance * 0.5
  if (event.down === 2) return event.gained_yards >= event.distance * 0.7
  return event.gained_yards >= event.distance
}

function isExplosivePlay(event: EventRow) {
  return Boolean(event.explosive) || (event.gained_yards ?? 0) >= 20
}

type TendencyOption = {
  label: string
  success: number
  explosive: number
  sample: number
  note?: string
}

function bucketDownDistance(down?: number | null, distance?: number | null) {
  if (!down || !distance) return 'any down'
  if (distance <= 2) return `short ${ordinal(down)}`
  if (distance <= 6) return `medium ${ordinal(down)}`
  return `long ${ordinal(down)}`
}

function ordinal(n: number) {
  const suffix = ['th', 'st', 'nd', 'rd'][((n + 90) % 100 - 10) % 10] || 'th'
  return `${n}${suffix}`
}

function pct(n: number) {
  return Math.round(n * 100)
}

function prettyLabel(label: string) {
  return label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function aggregateByKey(list: EventRow[], keyFn: (ev: EventRow) => string | null | undefined) {
  const map = new Map<string, { success: number; explosive: number; sample: number; yards: number }>()
  list.forEach((ev) => {
    const key = keyFn(ev)
    if (!key) return
    const bucket = map.get(key) || { success: 0, explosive: 0, sample: 0, yards: 0 }
    bucket.sample += 1
    bucket.success += isSuccessful(ev) ? 1 : 0
    bucket.explosive += isExplosivePlay(ev) ? 1 : 0
    bucket.yards += ev.gained_yards ?? 0
    map.set(key, bucket)
  })
  return Array.from(map.entries()).map(([label, stats]) => ({
    label,
    success: stats.sample ? stats.success / stats.sample : 0,
    explosive: stats.sample ? stats.explosive / stats.sample : 0,
    sample: stats.sample,
    note: `YPP ${stats.sample ? (stats.yards / stats.sample).toFixed(1) : '0.0'}`,
  }))
}

function topOptions(options: TendencyOption[]) {
  return options
    .filter((opt) => opt.sample > 0)
    .sort((a, b) => b.success - a.success || b.sample - a.sample)
}

function yardLineFromBallOn(ball_on: string | null) {
  if (!ball_on) return 50
  const num = Number(ball_on.replace(/[^0-9]/g, ''))
  if (Number.isNaN(num)) return 50
  if (ball_on.toUpperCase().startsWith('O')) return num
  if (ball_on.toUpperCase().startsWith('D') || ball_on.toUpperCase().startsWith('X')) return 100 - num
  return num
}

function fieldZone(yardLine: number) {
  if (yardLine <= 20) return 'backed up'
  if (yardLine <= 40) return 'coming out'
  if (yardLine <= 60) return 'midfield'
  if (yardLine <= 80) return 'fringe'
  return 'red zone'
}

function yppFromStats(opt?: TendencyOption) {
  if (!opt?.note) return '--'
  return opt.note.replace('YPP ', '')
}

function buildTendencyLens(events: EventRow[], unit: 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS') {
  if (events.length === 0) {
    return { summary: 'No charted plays yet to build tendencies.', options: [] as TendencyOption[] }
  }
  const current = events[0]
  const downBucket = bucketDownDistance(current.down, current.distance)
  const yardLine = yardLineFromBallOn(current.ball_on)
  const zone = fieldZone(yardLine)
  const driveLabel = current.drive_number ? `Drive ${current.drive_number}` : 'current drive'
  const filtered = events.filter((ev) => bucketDownDistance(ev.down, ev.distance) === downBucket)

  if (unit === 'OFFENSE') {
    const familyStats = aggregateByKey(filtered, (ev) => ev.play_family || 'UNKNOWN')
    const conceptStats = aggregateByKey(
      filtered,
      (ev) => ev.run_concept || ev.wr_concept_id || ev.play_call || ev.play_family || 'Concept'
    )
    const bestConcepts = topOptions(conceptStats)
    const bestFamily = topOptions(familyStats)[0]
    const summary = bestFamily
      ? `On ${downBucket} in ${driveLabel}, ${prettyLabel(bestFamily.label)} leads: ${pct(
          bestFamily.success
        )}% success, ${pct(bestFamily.explosive)}% explosive. In ${zone}, lean on ${prettyLabel(
          bestConcepts[0]?.label || bestFamily.label
        )}.`
      : `On ${downBucket} tonight, stay with your top concepts in this field zone (${zone}).`
    return { summary, options: bestConcepts.slice(0, 3) }
  }

  if (unit === 'DEFENSE') {
    const coverageStats = aggregateByKey(filtered, (ev) => ev.coverage_shell_post || ev.coverage_shell_pre || 'Coverage')
    const frontStats = aggregateByKey(filtered, (ev) => ev.front_code || 'Front')
    const bestCoverage = topOptions(coverageStats)[0]
    const bestFront = topOptions(frontStats)[0]
    const summary = `On ${downBucket}, ${prettyLabel(bestCoverage?.label || 'coverage')} with ${prettyLabel(
      bestFront?.label || 'front'
    )} has capped explosives to ${pct(bestCoverage?.explosive ?? 0)}%.`
    const options = topOptions([...coverageStats.slice(0, 3), ...frontStats.slice(0, 3)]).slice(0, 3)
    return { summary, options }
  }

  const stStats = aggregateByKey(filtered, (ev) => ev.st_play_type || 'ST call')
  const bestSt = topOptions(stStats)
  const summary = `In ${zone}, ${prettyLabel(bestSt[0]?.label || 'this call')} has driven best net results (avg ${yppFromStats(
    bestSt[0]
  )} yds).`
  return { summary, options: bestSt.slice(0, 3) }
}

function mapError(code?: string) {
  if (!code) return 'Unable to record play. Please try again.'
  if (code === 'session_closed') return 'Session already closed. Return to games to reopen.'
  if (code === 'invalid_input') return 'Please check required fields.'
  return 'Unable to record play. Please retry.'
}

function buildOptimisticEvent(formData: FormData, sequence: number, seriesTag?: string): EventRow {
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
    gained_yards: formData.get('gainedYards') ? Number(formData.get('gainedYards')) : null,
    drive_number: formData.get('driveNumber') ? Number(formData.get('driveNumber')) : null,
    play_family: (formData.get('play_family')?.toString() as EventRow['play_family']) || null,
    run_concept: formData.get('run_concept')?.toString() || null,
    wr_concept_id: formData.get('wr_concept_id')?.toString() || null,
    st_play_type: formData.get('st_play_type')?.toString() || null,
    st_variant: formData.get('st_variant')?.toString() || null,
    front_code: formData.get('front_code')?.toString() || null,
    defensive_structure_id: formData.get('defensive_structure_id')?.toString() || null,
    coverage_shell_pre: formData.get('coverage_shell_pre')?.toString() || null,
    coverage_shell_post: formData.get('coverage_shell_post')?.toString() || null,
    strength: formData.get('strength')?.toString() || null,
    series_tag: seriesTag || formData.get('series_tag')?.toString() || null,
    created_at: new Date().toISOString(),
  }
}

const fallbackId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

function normalizeRealtimeEvent(payload: Record<string, unknown>): EventRow {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? (payload.id as string) ?? crypto.randomUUID()
        : (payload.id as string) ?? fallbackId(),
    sequence: Number(payload.sequence ?? 0),
    quarter: (payload.quarter as number) ?? null,
    clock_seconds: (payload.clock_seconds as number) ?? null,
    down: (payload.down as number) ?? null,
    distance: (payload.distance as number) ?? null,
    ball_on: (payload.ball_on as string) ?? null,
    play_call: (payload.play_call as string) ?? null,
    result: (payload.result as string) ?? null,
    gained_yards: (payload.gained_yards as number) ?? null,
    play_family: (payload.play_family as EventRow['play_family']) ?? null,
    run_concept: (payload.run_concept as string) ?? null,
    wr_concept_id: (payload.wr_concept_id as string) ?? null,
    st_play_type: (payload.st_play_type as string) ?? null,
    st_variant: (payload.st_variant as string) ?? null,
    front_code: (payload.front_code as string) ?? null,
    defensive_structure_id: (payload.defensive_structure_id as string) ?? null,
    coverage_shell_pre: (payload.coverage_shell_pre as string) ?? null,
    coverage_shell_post: (payload.coverage_shell_post as string) ?? null,
    strength: (payload.strength as string) ?? null,
    drive_number: (payload.drive_number as number) ?? null,
    series_tag: null,
    created_at: (payload.created_at as string) ?? null,
  }
}

export function ChartEventPanel({
  sessionId,
  gameId,
  unitLabel,
  unit,
  initialEvents,
  nextSequence,
  recordAction,
  offenseFormations,
  offensePersonnel,
  backfieldOptions,
  backfieldFamilies = [],
  defenseStructures,
  wrConcepts,
}: ChartEventPanelProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const clockInputRef = useRef<HTMLInputElement>(null)
  const [events, setEvents] = useState<EventRow[]>(initialEvents)
  const latestEvent = events[0]
  const [sequenceCounter, setSequenceCounter] = useState(nextSequence)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({})
  const [inlineWarnings, setInlineWarnings] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [selectedPersonnel, setSelectedPersonnel] = useState<string>('')
  const [selectedBackfield, setSelectedBackfield] = useState<string>('')
  const [motionType, setMotionType] = useState<string>('NONE')
  const [hasMotion, setHasMotion] = useState<boolean>(false)
  const [hasShift, setHasShift] = useState<boolean>(false)
  const [isPlayAction, setIsPlayAction] = useState<boolean>(false)
  const [isShotPlay, setIsShotPlay] = useState<boolean>(false)
  const [markFirstDown, setMarkFirstDown] = useState<boolean>(false)
  const [markScoring, setMarkScoring] = useState<boolean>(false)
  const [markTurnover, setMarkTurnover] = useState<boolean>(false)
  const [seriesTag, setSeriesTag] = useState<string>('')
  const [seriesLookup, setSeriesLookup] = useState<Record<number, string>>({})
  const [gainedYardsValue, setGainedYardsValue] = useState<string>('')
  const [playFamily, setPlayFamily] = useState<'RUN' | 'PASS' | 'RPO' | 'SPECIAL_TEAMS'>(
    unit === 'SPECIAL_TEAMS' ? 'SPECIAL_TEAMS' : 'PASS'
  )
  const [passResult, setPassResult] = useState<string>('')
  const [quarterValue, setQuarterValue] = useState<string>(latestEvent?.quarter ? String(latestEvent.quarter) : '')
  const [ballOnValue, setBallOnValue] = useState<string>(latestEvent?.ball_on || '')
  const [hashValue, setHashValue] = useState<string>('')
  const [hasQuarterEdited, setHasQuarterEdited] = useState(false)
  const [hasBallOnEdited, setHasBallOnEdited] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({})
  const touchedFields = useRef<Set<string>>(new Set())
  const seriesSeed = useRef<number>(1)
  const eventType: EventType =
    unit === 'OFFENSE' ? 'Offense' : unit === 'DEFENSE' ? 'Defense' : 'Special Teams'

  const frontOptions = Array.from(new Set(defenseStructures.map((d) => d.name).filter(Boolean)))
  const offenseFormationsUnique = Array.from(
    new Map(offenseFormations.map((f) => [`${f.personnel}|${f.formation}`, f])).values()
  )
  const filteredFormations =
    selectedPersonnel && selectedPersonnel.length > 0
      ? offenseFormationsUnique.filter((f) => f.personnel === selectedPersonnel)
      : offenseFormationsUnique
  const stickyDefaults = useMemo(() => {
    return {
      offensive_personnel_code: latestEvent?.play_family !== 'SPECIAL_TEAMS' ? latestEvent?.play_call ? undefined : latestEvent?.play_call : latestEvent?.play_call,
    }
  }, [latestEvent])

  const selectedBackfieldMeta = selectedBackfield
    ? backfieldOptions.find((b) => b.code === selectedBackfield)
    : null
  const selectedQBAlignment =
    selectedBackfieldMeta && backfieldFamilies.length > 0
      ? backfieldFamilies
          .find((f) => f.backsLabel.startsWith(`${selectedBackfieldMeta.backs}`))
          ?.defaultQBAlignment.toUpperCase()
          .replace(/\s+\/\s+/g, '_') || 'UNDER_CENTER'
      : selectedBackfieldMeta?.description.toUpperCase().includes('SHOTGUN')
      ? 'SHOTGUN'
      : selectedBackfieldMeta?.description.toUpperCase().includes('PISTOL')
      ? 'PISTOL'
      : 'UNDER_CENTER'
  const qbAlignmentValue = selectedQBAlignment
  const dictionaryBundle = {
    offenseFormations,
    offensePersonnel,
    backfieldOptions,
    backfieldFamilies,
    defenseStructures,
    wrConcepts,
  }
  const eventsWithContext = useMemo(
    () => events.filter((ev) => ev.down != null && ev.distance != null && ev.gained_yards != null),
    [events]
  )
  const successRate = useMemo(() => {
    if (eventsWithContext.length === 0) return 0
    const successful = eventsWithContext.filter((ev) => isSuccessful(ev)).length
    return Math.round((successful / eventsWithContext.length) * 100)
  }, [eventsWithContext])
  const explosiveCount = useMemo(() => events.filter((ev) => isExplosivePlay(ev)).length, [events])
  const explosiveRate = events.length > 0 ? Math.round((explosiveCount / events.length) * 100) : 0
  const currentDriveNumber = latestEvent?.drive_number ?? null
  const currentDriveEvents = useMemo(
    () => (currentDriveNumber ? events.filter((ev) => ev.drive_number === currentDriveNumber) : []),
    [currentDriveNumber, events]
  )
  const currentDriveYards = useMemo(
    () => currentDriveEvents.reduce((sum, ev) => sum + (ev.gained_yards ?? 0), 0),
    [currentDriveEvents]
  )
  const lateDownAttempts = useMemo(
    () => events.filter((ev) => (ev.down ?? 0) >= 3 && ev.distance != null && ev.gained_yards != null),
    [events]
  )
  const lateDownRate = lateDownAttempts.length
    ? Math.round(
        (lateDownAttempts.filter(
          (ev) => (ev.gained_yards ?? 0) >= (ev.distance ?? Number.POSITIVE_INFINITY)
        ).length /
          lateDownAttempts.length) *
          100
      )
    : 0
  const averageGain = useMemo(() => {
    const withYards = events.filter((ev) => ev.gained_yards != null)
    return withYards.length > 0
      ? withYards.reduce((sum, ev) => sum + (ev.gained_yards ?? 0), 0) / withYards.length
      : 0
  }, [events])
  const displayQuarter = hasQuarterEdited ? quarterValue : latestEvent?.quarter ? String(latestEvent.quarter) : quarterValue
  const displayBallOn =
    hasBallOnEdited || !latestEvent?.ball_on ? ballOnValue : latestEvent.ball_on || ballOnValue
  const pendingOptimistic = events.some((ev) => ev.id.startsWith('optimistic'))
  const toggleChipClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-[0.75rem] transition duration-150 ${
      active ? 'border-brand bg-brand text-black' : 'border-slate-800 text-slate-200 hover:border-slate-700'
    }`
  const lastFive = useMemo(() => events.slice(0, 5), [events])
  const lastFiveSuccess = lastFive.filter((ev) => isSuccessful(ev)).length
  const lastFiveExplosive = lastFive.filter((ev) => isExplosivePlay(ev)).length
  const playFamilyCounts = useMemo(() => {
    return events.reduce<Record<NonNullable<EventRow['play_family']>, number>>(
      (acc, ev) => {
        if (ev.play_family) {
          acc[ev.play_family] = (acc[ev.play_family] || 0) + 1
        }
        return acc
      },
      { RUN: 0, PASS: 0, RPO: 0, SPECIAL_TEAMS: 0 }
    )
  }, [events])
  const unitCue =
    unit === 'OFFENSE'
      ? 'Emphasize tempo and hash; log QB alignment/motion for tendency work.'
      : unit === 'DEFENSE'
      ? 'Capture coverage and front quickly; log pressure when bringing heat.'
      : 'Track kick type/variant first; tag return yardage and ball spot.'
  const lens = useMemo(() => buildTendencyLens(events, unit), [events, unit])
  const gainedError = inlineErrors.gainedYards
  const gainedWarning = inlineWarnings.gainedYards
  const situationLabel = latestEvent
    ? `Q${latestEvent.quarter ?? '--'} | ${formatClock(latestEvent.clock_seconds)} | ${
        latestEvent.down ? `${latestEvent.down} & ${latestEvent.distance ?? '--'}` : '--'
      } | ${latestEvent.ball_on ?? '--'}`
    : 'No previous play logged'

  const handleMotionToggle = (checked: boolean) => {
    setHasMotion(checked)
    if (checked && motionType === 'NONE') setMotionType('JET')
    if (!checked) setMotionType('NONE')
  }

  const resetDynamicFieldsForEventType = () => {
    const defaults: Record<string, string | number | boolean> = {}
    const stickyKeys = new Set([
      'offensive_personnel_code',
      'offensive_formation_id',
      'backfield_code',
      'wr_concept_id',
      'run_concept',
      'front_code',
      'defensive_structure_id',
      'coverage_shell_pre',
      'coverage_shell_post',
      'st_play_type',
      'st_variant',
      'strength',
    ])
    FIELD_CONFIG[eventType].forEach((field) => {
      if (!stickyKeys.has(field.name)) {
        defaults[field.name] = field.type === 'checkbox' ? false : ''
      }
    })
    setFormData((prev) => ({ ...defaults, ...prev }))
    setSelectedPersonnel('')
    setSelectedBackfield('')
    setHasMotion(false)
    setMotionType('NONE')
    setHasShift(false)
    setIsPlayAction(false)
    setIsShotPlay(false)
    setMarkFirstDown(false)
    setMarkScoring(false)
    setMarkTurnover(false)
    setSeriesTag('')
    setGainedYardsValue('')
    setHasQuarterEdited(false)
    setHasBallOnEdited(false)
  }

  const upsertEvent = useCallback(
    (newEvent: EventRow) => {
      const seriesPatched: EventRow = {
        ...newEvent,
        series_tag:
          newEvent.series_tag ??
          (typeof newEvent.sequence === 'number' && seriesLookup[newEvent.sequence]
            ? seriesLookup[newEvent.sequence]
            : null),
      }
      setEvents((prev) => {
        const filtered = prev.filter((event) => event.id !== seriesPatched.id)
        return [seriesPatched, ...filtered].sort((a, b) => b.sequence - a.sequence).slice(0, 50)
      })
      setSequenceCounter((prev) => Math.max(prev, (seriesPatched.sequence ?? 0) + 1))
    },
    [seriesLookup]
  )

  const handleRealtimeEvent = useCallback(
    (payload: Record<string, unknown>) => {
      upsertEvent(normalizeRealtimeEvent(payload))
    },
    [upsertEvent]
  )

  const handleRealtimeDelete = useCallback((payload: Record<string, unknown>) => {
    const id = (payload as { id?: string }).id
    if (!id) return
    setEvents((prev) => prev.filter((ev) => ev.id !== id))
  }, [])

  useChartRealtime({
    sessionId,
    onEvent: handleRealtimeEvent,
    onDelete: handleRealtimeDelete,
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      }
      if (e.altKey && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        router.push(`/games/${gameId}/chart/offense`)
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        router.push(`/games/${gameId}/chart/defense`)
      }
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        router.push(`/games/${gameId}/chart/special_teams`)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router, gameId])

  useEffect(() => {
    if (!clockInputRef.current) return
    if (typeof document !== 'undefined' && document.activeElement && document.activeElement !== document.body) return
    clockInputRef.current.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const seeds: Record<string, string | number> = {}
    const last = latestEvent
    if (last) {
      if (last.play_family && !touchedFields.current.has('play_family')) {
        seeds.play_family = last.play_family
      }
      if (last.drive_number && !touchedFields.current.has('driveNumber')) {
        seeds.driveNumber = last.drive_number
      }
      if (last.coverage_shell_pre && !touchedFields.current.has('coverage_shell_pre')) seeds.coverage_shell_pre = last.coverage_shell_pre
      if (last.coverage_shell_post && !touchedFields.current.has('coverage_shell_post')) seeds.coverage_shell_post = last.coverage_shell_post
      if (last.front_code && !touchedFields.current.has('front_code')) seeds.front_code = last.front_code
      if (last.defensive_structure_id && !touchedFields.current.has('defensive_structure_id')) seeds.defensive_structure_id = last.defensive_structure_id
      if (last.st_play_type && !touchedFields.current.has('st_play_type')) seeds.st_play_type = last.st_play_type
      if (last.st_variant && !touchedFields.current.has('st_variant')) seeds.st_variant = last.st_variant
      if (last.run_concept && !touchedFields.current.has('run_concept')) seeds.run_concept = last.run_concept
      if (last.wr_concept_id && !touchedFields.current.has('wr_concept_id')) seeds.wr_concept_id = last.wr_concept_id
    }
    if (Object.keys(seeds).length > 0) {
      setFormData((prev) => ({ ...seeds, ...prev }))
    }

    if (last?.drive_number) {
      if (!touchedFields.current.has('series_tag')) {
        if (seriesSeed.current === 1 || last.drive_number !== (formData.driveNumber as number | undefined)) {
          seriesSeed.current = 1
        }
        if (last.down === 1) {
          seriesSeed.current += 1
        }
        setSeriesTag(String(seriesSeed.current))
      }
    }
  }, [latestEvent, formData.driveNumber])


  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    formData.set('sessionId', sessionId)
    formData.set('play_family', playFamily)
    const seriesValue = seriesTag.trim() || ''
    if (seriesValue) {
      formData.set('series_tag', seriesValue)
      setSeriesLookup((prev) => ({ ...prev, [sequenceCounter]: seriesValue }))
    }
    // Ensure advanced tags are always present in the payload, even if the Advanced section is collapsed.
    formData.set('qb_alignment', qbAlignmentValue)
    formData.set('motion_type', hasMotion ? motionType : 'NONE')
    formData.set('has_motion', String(hasMotion))
    formData.set('has_shift', String(hasShift))
    formData.set('is_play_action', String(isPlayAction))
    formData.set('is_shot_play', String(isShotPlay))
    if (selectedBackfieldMeta?.backs != null) {
      formData.set('backs_count', String(selectedBackfieldMeta.backs))
    }
    const formationMeta = offenseFormations.find(
      (formation) => formation.id === formData.get('offensive_formation_id')?.toString()
    )
    if (formationMeta) {
      formData.set('offensive_formation_label', `${formationMeta.personnel} | ${formationMeta.formation}`)
    }
    const wrConceptMeta = wrConcepts.find((w) => w.id === formData.get('wr_concept_id')?.toString())
    if (wrConceptMeta) {
      formData.set('wr_concept_label', wrConceptMeta.name)
      if (wrConceptMeta.family) formData.set('wr_concept_family', wrConceptMeta.family)
      if (wrConceptMeta.qbDrop) formData.set('qb_drop', wrConceptMeta.qbDrop)
      if (wrConceptMeta.coverageBeater?.length) {
        formData.set('primary_coverage_beater', wrConceptMeta.coverageBeater[0])
      }
    }
    const gainedValue = formData.get('gainedYards')
    const gainedNumber = gainedValue !== null && gainedValue !== '' ? Number(gainedValue) : undefined
    const distanceValue = formData.get('distance')
    const distanceNumber = distanceValue !== null && distanceValue !== '' ? Number(distanceValue) : undefined
    const validationInput = {
      unit,
      play_family: playFamily,
      offensive_personnel_code: formData.get('offensive_personnel_code')?.toString() || undefined,
      offensive_formation_id: formData.get('offensive_formation_id')?.toString() || undefined,
      backfield_code: formData.get('backfield_code')?.toString() || undefined,
      backs_count: selectedBackfieldMeta?.backs ?? null,
      wr_concept_id: formData.get('wr_concept_id')?.toString() || undefined,
      run_concept: formData.get('run_concept')?.toString() || undefined,
      is_rpo: playFamily === 'RPO',
      coverage_shell_pre: formData.get('coverage_shell_pre')?.toString() || undefined,
      coverage_shell_post: formData.get('coverage_shell_post')?.toString() || undefined,
      st_play_type: formData.get('st_play_type')?.toString() || undefined,
      st_variant: formData.get('st_variant')?.toString() || undefined,
      gained_yards: gainedNumber,
      pass_result: formData.get('pass_result')?.toString() || undefined,
      st_return_yards:
        formData.get('st_return_yards') && formData.get('st_return_yards') !== ''
          ? Number(formData.get('st_return_yards'))
          : undefined,
    }
    const validation = validateChartEventInput(validationInput, dictionaryBundle)
    if (!validation.ok) {
      setErrorMessage('Please check required fields.')
      const fieldErrors: Record<string, string> = {}
      validation.errors.forEach((msg) => {
        if (msg.toLowerCase().includes('personnel')) fieldErrors.offensive_personnel_code = msg
        if (msg.toLowerCase().includes('formation')) fieldErrors.offensive_formation_id = msg
        if (msg.toLowerCase().includes('backfield')) fieldErrors.backfield_code = msg
        if (msg.toLowerCase().includes('yardage')) fieldErrors.gainedYards = msg
        if (msg.toLowerCase().includes('coverage')) fieldErrors.coverage_shell_post = msg
        if (msg.toLowerCase().includes('st play type')) fieldErrors.st_play_type = msg
      })
      setInlineErrors(fieldErrors)
      return
    }
    setInlineErrors({})
    setErrorMessage(null)
    setWarningMessage(validation.warnings.length > 0 ? validation.warnings.join('; ') : null)
    const fieldWarnings: Record<string, string> = {}
    validation.warnings.forEach((msg) => {
      if (msg.toLowerCase().includes('yardage')) fieldWarnings.gainedYards = msg
      if (msg.toLowerCase().includes('coverage')) fieldWarnings.coverage_shell_post = msg
    })
    setInlineWarnings(fieldWarnings)

    if (markFirstDown || (distanceNumber != null && gainedNumber != null && gainedNumber >= distanceNumber)) {
      formData.set('first_down', 'true')
    }
    if (markScoring) {
      formData.set('scoring_play', 'true')
    }
    if (markTurnover) {
      formData.set('turnover', 'true')
    }
    if (gainedNumber != null && gainedNumber >= 20) {
      formData.set('explosive', 'true')
    }

    const optimisticEvent = buildOptimisticEvent(formData, sequenceCounter, seriesValue || undefined)
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
      setWarningMessage(null)
      formRef.current?.reset()
      resetDynamicFieldsForEventType()
      setPassResult('')
      setInlineWarnings({})
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      <GlassCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-semibold text-slate-100">Live charting | {unitLabel}</h2>
            <div className="text-sm text-slate-300">
              Shortcut-friendly charting: tab to move, Ctrl/Cmd+Enter saves, Alt+O/D/S switches units.
            </div>
            <Pill label={situationLabel} tone="slate" />
            <div className="text-xs text-slate-300">
              ALT+O = Offense | ALT+D = Defense | ALT+S = ST | CTRL/CMD+Enter = Save play
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Pill label={unit} tone="emerald" />
            <span className="text-[0.75rem] text-slate-200 text-right">Alt+O/D/S = unit | Ctrl/Cmd+Enter = save</span>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Pill label={`Success ${successRate}%`} tone="emerald" />
          <Pill label={`Explosive ${explosiveRate}%`} tone="amber" />
          <Pill
            label={`Drive ${currentDriveNumber ?? '--'} | ${currentDriveEvents.length || 0}P / ${currentDriveYards} yds`}
            tone="slate"
          />
          <Pill label={`Late downs ${lateDownRate}%`} tone="cyan" />
          <Pill label={`Avg gain ${averageGain.toFixed(1)} yds`} tone="slate" />
          {pendingOptimistic && <Pill label="Pending sync" tone="amber" />}
        </div>
      </GlassCard>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <GlassCard className="space-y-6">
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <section className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-slate-300">Situation</h3>
                  <p className="text-xs text-slate-400">Quarter, clock, down & distance, spot, hash</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-1">
                  <span className="uppercase tracking-[0.18em] text-[0.7rem] text-slate-300">Quarter</span>
                  <select
                    name="quarter"
                    value={displayQuarter}
                    onChange={(e) => {
                      setHasQuarterEdited(true)
                      setQuarterValue(e.target.value)
                    }}
                    className="h-11 w-full rounded-xl border border-slate-800 bg-surface-muted px-3 text-sm text-slate-100 hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus"
                  >
                    <option value="">--</option>
                    {quarterOptions.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="uppercase tracking-[0.18em] text-[0.7rem] text-slate-300">Clock (MM:SS)</span>
                  <input
                    name="clock"
                    placeholder="12:34"
                    pattern="[0-5]?[0-9]:[0-5][0-9]"
                    ref={clockInputRef}
                    className="h-11 w-full rounded-xl border border-slate-800 bg-surface-muted px-3 text-sm text-slate-100 hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus"
                  />
                </label>

                <label className="space-y-1">
                  <span className="uppercase tracking-[0.18em] text-[0.7rem] text-slate-300">Down</span>
                  <select
                    name="down"
                    defaultValue={latestEvent?.down ? String(latestEvent.down) : ''}
                    className="h-11 w-full rounded-xl border border-slate-800 bg-surface-muted px-3 text-sm text-slate-100 hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus"
                  >
                    {downOptions.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="uppercase tracking-[0.18em] text-[0.7rem] text-slate-300">Distance</span>
                  <input
                    name="distance"
                    type="number"
                    min={1}
                    defaultValue={latestEvent?.distance ?? ''}
                    className="h-11 w-full rounded-xl border border-slate-800 bg-surface-muted px-3 text-sm text-slate-100 hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus"
                  />
                </label>

                <label className="space-y-1">
                  <span className="uppercase tracking-[0.18em] text-[0.7rem] text-slate-300">Ball on</span>
                  <input
                    name="ballOn"
                    value={displayBallOn}
                    onChange={(e) => {
                      setHasBallOnEdited(true)
                      setBallOnValue(e.target.value)
                    }}
                    placeholder="O35"
                    className="h-11 w-full rounded-xl border border-slate-800 bg-surface-muted px-3 text-sm text-slate-100 hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus"
                  />
                </label>

                <label className="space-y-1">
                  <span className="uppercase tracking-[0.18em] text-[0.7rem] text-slate-300">Hash</span>
                  <select
                    name="hashMark"
                    value={hashValue}
                  onChange={(e) => {
                      setHashValue(e.target.value)
                    }}
                    className="h-11 w-full rounded-xl border border-slate-800 bg-surface-muted px-3 text-sm text-slate-100 hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus"
                  >
                    {hashOptions.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="uppercase tracking-[0.18em] text-[0.7rem] text-slate-300">Drive #</span>
                  <input
                    name="driveNumber"
                    type="number"
                    min={1}
                    defaultValue={latestEvent?.drive_number ?? ''}
                    className="h-11 w-full rounded-xl border border-slate-800 bg-surface-muted px-3 text-sm text-slate-100 hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus"
                  />
                </label>
              </div>
            </section>

          <section className="space-y-4 border-t border-slate-900/70 pt-6">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-slate-300">Play type</h3>
            <p className="text-xs text-slate-400">
              {unit === 'OFFENSE'
                ? 'Pick run, pass, or RPO to tailor offensive tags. Special teams disabled here.'
                : unit === 'DEFENSE'
                ? 'Tag the offensive family faced to pair with front/coverage tendencies.'
                : 'Special teams mode is locked for this unit.'}
            </p>
            {unit === 'SPECIAL_TEAMS' ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-surface-muted px-3 py-2 text-xs text-amber-100">
                Special teams mode is locked for this unit. Tag kick type + variant and return yards.
              </div>
            ) : (
              <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-slate-800 bg-surface-muted p-1 text-xs transition duration-base ease-smooth focus-visible:shadow-focus focus-visible:outline-none">
                <button
                  type="button"
                  onClick={() => setPlayFamily('RUN')}
                  className={`rounded-full px-3 py-1 transition duration-base ease-smooth focus-visible:shadow-focus focus-visible:outline-none ${
                    playFamily === 'RUN' ? 'bg-brand text-black' : 'text-slate-300'
                  }`}
                >
                  Run
                </button>
                <button
                  type="button"
                  onClick={() => setPlayFamily('PASS')}
                  className={`rounded-full px-3 py-1 transition duration-base ease-smooth focus-visible:shadow-focus focus-visible:outline-none ${
                    playFamily === 'PASS' ? 'bg-brand text-black' : 'text-slate-300'
                  }`}
                >
                  Pass
                </button>
                <button
                  type="button"
                  onClick={() => setPlayFamily('RPO')}
                  className={`rounded-full px-3 py-1 transition duration-base ease-smooth focus-visible:shadow-focus focus-visible:outline-none ${
                    playFamily === 'RPO' ? 'bg-brand text-black' : 'text-slate-300'
                  }`}
                >
                  RPO
                </button>
              </div>
            )}
          </section>

          <section className="space-y-4 border-t border-slate-900/70 pt-6">
              <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-slate-300">
                Formation & tags
              </h3>
              <p className="text-xs text-slate-400">
                Tag formation, structure, and concepts for quick scouting across units.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
              {FIELD_CONFIG[eventType].map((field: FieldConfig) => {
                const prettify = (opt: string) =>
                  opt
                    .split('_')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                    .join(' ')
                const baseOptions =
                  field.name === 'offensive_personnel_code'
                    ? offensePersonnel.map((code) => ({ value: code, label: code }))
                    : field.name === 'offensive_formation_id'
                    ? filteredFormations.map((f) => ({ value: f.id, label: `${f.personnel} | ${f.formation}` }))
                    : field.name === 'backfield_code'
                    ? backfieldOptions.map((b) => ({
                        value: b.code,
                        label: b.description ? `${b.code} | ${b.description}` : b.code,
                      }))
                    : field.name === 'wr_concept_id'
                    ? wrConcepts.map((w) => ({
                        value: w.id,
                        label: w.family ? `${w.family} | ${w.name}` : w.name,
                      }))
                    : field.name === 'front_code'
                    ? frontOptions.map((name) => ({ value: name, label: name }))
                    : field.name === 'defensive_structure_id'
                    ? defenseStructures.map((d) => ({ value: d.id, label: d.name || d.id }))
                    : field.name === 'coverage_shell_pre'
                    ? coverageShellOptions.map((c) => ({ value: c.value, label: c.label }))
                    : field.name === 'coverage_shell_post'
                    ? coveragePostOptions.map((c) => ({ value: c.value, label: c.label }))
                    : (field.options || []).map((opt) => ({ value: opt, label: prettify(opt) }))
                const error = inlineErrors[field.name]
                const warning = inlineWarnings[field.name]
                const baseInputClass =
                  'w-full rounded-xl border px-4 py-3 text-sm transition duration-base ease-smooth ' +
                  (error
                    ? 'border-red-500 bg-red-950/30 text-red-50'
                    : warning
                    ? 'border-amber-500 bg-amber-950/30 text-amber-50'
                    : 'border-slate-800 bg-surface-muted text-slate-100')
    const handleChange = (value: string | boolean) => {
                  touchedFields.current.add(field.name)
                  setFormData((prev) => ({ ...prev, [field.name]: value }))
                  if (field.name === 'offensive_personnel_code') setSelectedPersonnel(String(value))
                  if (field.name === 'backfield_code') setSelectedBackfield(String(value))
                }
                return (
                  <label key={field.name} className="space-y-1 text-xs text-slate-200 block">
                    <span className="uppercase tracking-[0.18em] text-[0.7rem] text-slate-300">{field.label}</span>
                    {field.type === 'select' && (
                      <select
                        name={field.name}
                        value={(formData[field.name] as string) ?? ''}
                        onChange={(e) => handleChange(e.target.value)}
                        className={`${baseInputClass} hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus`}
                      >
                        <option value="">Select</option>
                        {baseOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {field.type === 'text' && (
                      <input
                        type="text"
                        name={field.name}
                        value={(formData[field.name] as string) ?? ''}
                        onChange={(e) => handleChange(e.target.value)}
                        className={`${baseInputClass} hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus`}
                      />
                    )}
                    {field.type === 'checkbox' && (
                      <input
                        type="checkbox"
                        name={field.name}
                        checked={Boolean(formData[field.name])}
                        onChange={(e) => handleChange(e.target.checked)}
                        className="h-4 w-4"
                      />
                    )}
                    {field.type === 'number' && (
                      <input
                        type="number"
                        name={field.name}
                        value={(formData[field.name] as string) ?? ''}
                        onChange={(e) => handleChange(e.target.value)}
                        className={`${baseInputClass} hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus`}
                      />
                    )}
                    {error && <p className="text-[0.7rem] text-red-300">{error}</p>}
                    {!error && warning && (
                      <p className="text-[0.7rem] text-amber-300">{warning}</p>
                    )}
                  </label>
                )
              })}
                {(unit === 'OFFENSE' || unit === 'DEFENSE') && (
                  <label className="space-y-1 text-xs text-slate-200 block">
                    <span className="uppercase tracking-[0.18em] text-[0.7rem] text-slate-300">Strength</span>
                    <select
                      name="strength"
                      value={(formData.strength as string) ?? ''}
                      onChange={(e) => {
                        touchedFields.current.add('strength')
                        setFormData((prev) => ({ ...prev, strength: e.target.value }))
                      }}
                      className="w-full rounded-xl border border-slate-800 bg-surface-muted px-4 py-3 text-sm text-slate-100 hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus"
                    >
                      <option value="">Select</option>
                      {strengthOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {prettifyLabel(opt)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-900/70 pt-6">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-slate-300">Result & gain</h3>
            <p className="text-xs text-slate-400">Capture the call, a quick note, yardage, and pass result.</p>
            <div className="space-y-3">
              <label className="space-y-1 block">
                <span className="uppercase tracking-[0.18em] text-[0.7rem] text-slate-300">Play call</span>
                <input
                  name="playCall"
                  placeholder="Trips Right 92 Mesh"
                  className="w-full rounded-xl border border-slate-800 bg-surface-muted px-4 py-3 text-sm text-slate-100 hover:border-slate-700 focus:outline-none focus:border-brand/60 focus:shadow-focus"
                  required
                />
              </label>

              <label className="space-y-1 block">
                <span className="uppercase tracking-[0.18em] text-[0.7rem] text-slate-300">Result (short note)</span>
                <input
                  name="result"
                  placeholder="Complete, +8"
                  className="w-full rounded-xl border border-slate-800 bg-surface-muted px-4 py-3 text-sm text-slate-100 hover:border-slate-700 focus:outline-none focus:border-brand/60 focus:shadow-focus"
                />
              </label>

              <label className="space-y-1 block">
                <span className="uppercase tracking-[0.18em] text-[0.7rem] text-slate-300">Yards gained</span>
                <input
                  name="gainedYards"
                  type="number"
                  min={-99}
                  max={99}
                  value={gainedYardsValue}
                  onChange={(e) => setGainedYardsValue(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 text-sm transition duration-base ease-smooth ${
                    gainedError
                      ? 'border-red-500 bg-red-950/30 text-red-50'
                      : gainedWarning
                      ? 'border-amber-500 bg-amber-950/30 text-amber-50'
                      : 'border-slate-800 bg-surface-muted text-slate-100'
                  } hover:border-slate-700 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand`}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickGainOptions.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setGainedYardsValue(String(val))}
                      className={toggleChipClass(gainedYardsValue === String(val))}
                    >
                      {val > 0 ? `+${val}` : val}
                    </button>
                  ))}
                </div>
                {gainedError && (
                  <p className="text-[0.7rem] text-red-300">{gainedError}</p>
                )}
                {!gainedError && gainedWarning && (
                  <p className="text-[0.7rem] text-amber-300">{gainedWarning}</p>
                )}
              </label>

              <label className="space-y-1 block">
                <span className="uppercase tracking-[0.18em] text-[0.7rem] text-slate-300">Pass result</span>
                <select
                  name="pass_result"
                  value={passResult}
                  onChange={(e) => setPassResult(e.target.value)}
                  disabled={playFamily === 'RUN' || playFamily === 'SPECIAL_TEAMS'}
                  className="w-full rounded-xl border border-slate-800 bg-surface-muted px-4 py-3 text-sm text-slate-100 hover:border-slate-700 focus:outline-none focus:border-brand/60 focus:shadow-focus disabled:opacity-50"
                >
                  <option value="">--</option>
                  {passResultOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMarkFirstDown((prev) => !prev)}
                  className={toggleChipClass(markFirstDown)}
                >
                  1st Down
                </button>
                <button
                  type="button"
                  onClick={() => setMarkScoring((prev) => !prev)}
                  className={toggleChipClass(markScoring)}
                >
                  Scoring
                </button>
                <button
                  type="button"
                  onClick={() => setMarkTurnover((prev) => !prev)}
                  className={toggleChipClass(markTurnover)}
                >
                  Turnover
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-900/70 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-slate-300">Optional tags</h3>
              <button
                type="button"
                onClick={() => setAdvancedOpen((prev) => !prev)}
                className="text-xs text-slate-300 underline transition duration-base ease-smooth focus-visible:shadow-focus focus-visible:outline-none"
              >
                {advancedOpen ? 'Hide tags' : 'Show tags'}
              </button>
            </div>
            <p className="text-xs text-slate-400">Add motion, alignment, series, and notes to enrich each play.</p>
            {advancedOpen && (
              <div className="space-y-3">
                {unit === 'OFFENSE' && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="space-y-1 text-xs text-slate-200">
                  <span className="uppercase tracking-[0.18em]">Motion</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={hasMotion}
                            onChange={(e) => handleMotionToggle(e.target.checked)}
                            className="accent-brand"
                          />
                          <span>Track motion</span>
                        </label>
                        {hasMotion && (
                            <select
                              name="motion_type"
                              value={motionType}
                              onChange={(e) => setMotionType(e.target.value)}
                              className="rounded-xl border border-slate-800 bg-surface-muted px-4 py-3 text-xs text-slate-100 hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus"
                            >
                              <option value="JET">Jet</option>
                            <option value="ORBIT">Orbit</option>
                            <option value="YOYO">Yo-Yo</option>
                            <option value="ACROSS">Across</option>
                            <option value="RETURN">Return</option>
                            <option value="RESET">Reset</option>
                          </select>
                        )}
                        {!hasMotion && <input type="hidden" name="motion_type" value="NONE" />}
                      </div>
                    </label>

                    <label className="space-y-1 text-xs text-slate-200">
                      <span className="uppercase tracking-[0.18em]">QB alignment</span>
                      <input
                        name="qb_alignment"
                        value={qbAlignmentValue}
                        readOnly
                        className="w-36 rounded-xl border border-slate-800 bg-surface-muted px-4 py-3 text-sm text-slate-100"
                      />
                    </label>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setHasShift((prev) => !prev)}
                    className={toggleChipClass(hasShift)}
                  >
                    Shift
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPlayAction((prev) => !prev)}
                    className={toggleChipClass(isPlayAction)}
                  >
                    Play Action
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsShotPlay((prev) => !prev)}
                    className={toggleChipClass(isShotPlay)}
                  >
                    Shot Play
                  </button>
                </div>

                <label className="space-y-1 text-xs text-slate-200 block">
                  <span className="uppercase tracking-[0.18em]">Series # (within drive)</span>
                  <input
                    name="series_tag"
                    value={seriesTag}
                    onChange={(e) => {
                      touchedFields.current.add('series_tag')
                      setSeriesTag(e.target.value)
                    }}
                    placeholder="1, 2, 3..."
                    className="w-32 rounded-xl border border-slate-800 bg-surface-muted px-4 py-3 text-sm text-slate-100 hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus"
                  />
                </label>

                {unit === 'DEFENSE' && (
                  <label className="space-y-1 text-xs text-slate-200">
                    <span className="uppercase tracking-[0.18em]">Pressure tag</span>
                    <input
                      name="pressure_code"
                      placeholder="Fire zone, SIM, boundary..."
                      className="w-full rounded-xl border border-slate-800 bg-surface-muted px-4 py-3 text-sm text-slate-100 hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus"
                    />
                  </label>
                )}

                <label className="space-y-1 text-xs text-slate-200 block">
                  <span className="uppercase tracking-[0.18em]">Notes</span>
                  <textarea
                    name="notes"
                    rows={2}
                    className="w-full rounded-xl border border-slate-800 bg-surface-muted px-4 py-3 text-sm text-slate-100 hover:border-slate-700 focus:border-brand/60 focus:outline-none focus:shadow-focus"
                    placeholder="Coverage bust, pressure from boundary..."
                  />
                </label>
              </div>
            )}
          </section>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
              {errorMessage}
            </div>
          )}
          {warningMessage && !errorMessage && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
              {warningMessage}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <CTAButton type="submit" disabled={isPending} variant="primary">
              {isPending ? 'Saving...' : 'Log play'}
            </CTAButton>
          </div>
          </form>
        </GlassCard>

        <div className="space-y-4 lg:sticky lg:top-0 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto">
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-slate-100">AI analyst</h2>
              <Pill label="Live" tone="emerald" />
            </div>
            <p className="text-sm text-slate-300">{lens.summary || unitCue}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-900/60 bg-surface-muted p-3">
                <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">Mix</p>
                <p className="text-sm text-slate-100">
                  Run {playFamilyCounts.RUN} | Pass {playFamilyCounts.PASS} | RPO {playFamilyCounts.RPO} | ST{' '}
                  {playFamilyCounts.SPECIAL_TEAMS}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-900/60 bg-surface-muted p-3">
                <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">Last 5</p>
                <p className="text-sm text-slate-100">
                  {lastFive.length} plays | {lastFiveSuccess} success | {lastFiveExplosive} explosive | Avg{' '}
                  {lastFive.length ? (lastFive.reduce((s, ev) => s + (ev.gained_yards ?? 0), 0) / lastFive.length).toFixed(1) : '0.0'}{' '}
                  yds
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {lens.options.slice(0, 3).map((opt) => (
                <div
                  key={opt.label}
                  className="rounded-2xl border border-slate-900/60 bg-surface-muted p-3 text-sm text-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{prettyLabel(opt.label)}</span>
                    <span className="text-xs text-slate-400">{opt.sample} plays</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Success {pct(opt.success)}% | Explosive {pct(opt.explosive)}%
                  </div>
                  {opt.note && <div className="text-[0.7rem] text-slate-400 mt-1">{opt.note}</div>}
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Recent plays</h2>
              <p className="text-sm text-slate-300">
                Shows the latest plays, including ones still syncing.
              </p>
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                <div className="empty-state">
                  <div className="text-sm">No plays logged yet for this game.</div>
                </div>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-slate-900/60 bg-surface-muted px-4 py-3 text-sm text-slate-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                      <span>
                        Seq {event.sequence} | Q{event.quarter || '--'} {formatClock(event.clock_seconds)} | Drive{' '}
                        {event.drive_number ?? '--'}
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {event.id.startsWith('optimistic') && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[0.7rem] text-amber-200">
                            Syncing
                          </span>
                        )}
                        {isSuccessful(event) && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.7rem] text-emerald-200">
                            Success
                          </span>
                        )}
                        {isExplosivePlay(event) && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[0.7rem] text-amber-200">
                            Explosive
                          </span>
                        )}
                        {(event.turnover ||
                          (event.result || '').toLowerCase().includes('int') ||
                          (event.result || '').toLowerCase().includes('fumble')) && (
                          <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[0.7rem] text-red-200">
                            Turnover
                          </span>
                        )}
                        {event.series_tag && (
                          <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2 py-0.5 text-[0.7rem] text-slate-100">
                            Series {event.series_tag}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-base font-semibold text-slate-50">{event.play_call || 'Play call TBD'}</div>
                    <div className="text-xs text-slate-200 flex items-center gap-2">
                      <span>
                        {event.result || 'Result TBD'} | Yardage: {formatYards(event.gained_yards)} | Down/Dist:{' '}
                        {event.down ? `${event.down} & ${event.distance ?? '?'}` : '--'}
                      </span>
                    </div>

                    <div className="text-[0.7rem] text-slate-400">
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
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

