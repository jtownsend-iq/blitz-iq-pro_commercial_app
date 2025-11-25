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

function formatClock(seconds: number | null) {
  if (seconds == null) return '--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function mapError(code?: string) {
  if (!code) return 'Unable to record play. Please try again.'
  if (code === 'session_closed') return 'Session already closed. Return to games to reopen.'
  if (code === 'invalid_input') return 'Please check required fields.'
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
    gained_yards: formData.get('gainedYards') ? Number(formData.get('gainedYards')) : null,
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
  const [sequenceCounter, setSequenceCounter] = useState(nextSequence)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({})
  const [inlineWarnings, setInlineWarnings] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [events, setEvents] = useState<EventRow[]>(initialEvents)
  const [selectedPersonnel, setSelectedPersonnel] = useState<string>('')
  const [selectedFormation, setSelectedFormation] = useState<string>('')
  const [selectedBackfield, setSelectedBackfield] = useState<string>('')
  const [selectedWRConcept, setSelectedWRConcept] = useState<string>('')
  const [qbAlignment, setQbAlignment] = useState<string>('UNDER_CENTER')
  const [motionType, setMotionType] = useState<string>('NONE')
  const [hasMotion, setHasMotion] = useState<boolean>(false)
  const [playFamily, setPlayFamily] = useState<'RUN' | 'PASS' | 'RPO' | 'SPECIAL_TEAMS'>(
    unit === 'SPECIAL_TEAMS' ? 'SPECIAL_TEAMS' : 'PASS'
  )
  const [runConcept, setRunConcept] = useState<string>('')
  const [passResult, setPassResult] = useState<string>('')
  const [stPlayType, setStPlayType] = useState<string>('')
  const [stVariant, setStVariant] = useState<string>('NORMAL')
  const [stReturnYards, setStReturnYards] = useState<string>('')

  const defenseNames = Array.from(new Set(defenseStructures.map((d) => d.name).filter(Boolean)))
  const frontOptions = defenseNames
  const offenseFormationsUnique = Array.from(
    new Map(offenseFormations.map((f) => [`${f.personnel}|${f.formation}`, f])).values()
  )
  const filteredFormations =
    selectedPersonnel && selectedPersonnel.length > 0
      ? offenseFormationsUnique.filter((f) => f.personnel === selectedPersonnel)
      : offenseFormationsUnique

  const selectedBackfieldMeta = selectedBackfield
    ? backfieldOptions.find((b) => b.code === selectedBackfield)
    : null
  const selectedBackfieldFamily =
    selectedBackfieldMeta && backfieldFamilies.length > 0
      ? backfieldFamilies.find((f) => f.backsLabel.startsWith(`${selectedBackfieldMeta.backs}`))
          ?.classification ?? selectedBackfieldMeta.description
      : selectedBackfieldMeta?.description || ''
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
  const qbAlignmentValue = qbAlignment || selectedQBAlignment
  const selectedWRConceptMeta = selectedWRConcept
    ? wrConcepts.find((c) => c.id === selectedWRConcept)
    : null
  const dictionaryBundle = useMemo(
    () => ({
      offenseFormations,
      offensePersonnel,
      backfieldOptions,
      backfieldFamilies,
      defenseStructures,
      wrConcepts,
    }),
    [offenseFormations, offensePersonnel, backfieldOptions, backfieldFamilies, defenseStructures, wrConcepts]
  )

  const handleMotionToggle = (checked: boolean) => {
    setHasMotion(checked)
    if (checked && motionType === 'NONE') {
      setMotionType('JET')
    }
    if (!checked) setMotionType('NONE')
  }

  const upsertEvent = useCallback(
    (newEvent: EventRow) => {
      setEvents((prev) => {
        const filtered = prev.filter((event) => event.id !== newEvent.id)
        return [newEvent, ...filtered].slice(0, 50)
      })
    },
    [setEvents]
  )

  useChartRealtime({
    sessionId,
    onEvent: (payload) => {
      upsertEvent(normalizeRealtimeEvent(payload))
    },
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      }
      if (e.altKey && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        setPlayFamily('PASS')
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setPlayFamily('RUN')
      }
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        setPlayFamily('SPECIAL_TEAMS')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    formData.set('sessionId', sessionId)
    formData.set('play_family', playFamily)

    if (!formData.get('playCall')?.toString().trim()) {
      setErrorMessage('Play call is required.')
      return
    }
    const clock = formData.get('clock')?.toString()
    if (clock && !clockPattern.test(clock)) {
      setErrorMessage('Clock must be formatted MM:SS.')
      return
    }
    if (unit === 'OFFENSE' && (!formData.get('offensive_personnel_code') || !formData.get('offensive_formation_id'))) {
      setErrorMessage('Offensive personnel and formation are required.')
      return
    }

    const validation = validateChartEventInput(
      {
        unit,
        play_family: playFamily,
        offensive_personnel_code: formData.get('offensive_personnel_code')?.toString() || null,
        offensive_formation_id: formData.get('offensive_formation_id')?.toString() || null,
        backfield_code: formData.get('backfield_code')?.toString() || null,
        backs_count: formData.get('backs_count') ? Number(formData.get('backs_count')?.toString()) : null,
        wr_concept_id: formData.get('wr_concept_id')?.toString() || null,
        run_concept: formData.get('run_concept')?.toString() || null,
        is_rpo: formData.get('is_rpo') ? true : false,
        coverage_shell_pre: formData.get('coverage_shell_pre')?.toString() || null,
        coverage_shell_post: formData.get('coverage_shell_post')?.toString() || null,
        st_play_type: formData.get('st_play_type')?.toString() || null,
        st_variant: formData.get('st_variant')?.toString() || null,
        gained_yards: formData.get('gainedYards')
          ? Number(formData.get('gainedYards')?.toString())
          : null,
        pass_result: formData.get('pass_result')?.toString() || null,
        st_return_yards: formData.get('st_return_yards')
          ? Number(formData.get('st_return_yards')?.toString())
          : null,
      },
      dictionaryBundle
    )

    if (!validation.ok) {
      setErrorMessage(validation.errors.join('; '))
      const fieldErrors: Record<string, string> = {}
      validation.errors.forEach((msg) => {
        if (msg.toLowerCase().includes('personnel')) fieldErrors.offensive_personnel_code = msg
        if (msg.toLowerCase().includes('formation')) fieldErrors.offensive_formation_id = msg
        if (msg.toLowerCase().includes('backfield')) fieldErrors.backfield_code = msg
        if (msg.toLowerCase().includes('rpo')) fieldErrors.run_concept = msg
        if (msg.toLowerCase().includes('special teams')) fieldErrors.st_play_type = msg
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
      setWarningMessage(null)
      form.reset()
      setSelectedPersonnel('')
      setSelectedFormation('')
      setSelectedBackfield('')
      setSelectedWRConcept('')
      setRunConcept('')
      setPassResult('')
      setStPlayType('')
      setStVariant('NORMAL')
      setStReturnYards('')
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5 rounded-3xl border border-slate-900/70 bg-black/30 p-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Log a play</h2>
          <p className="text-sm text-slate-500">
            {unitLabel} analysts capture each snap. Required fields are minimal to keep pace.
          </p>
        </div>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 rounded-2xl border border-slate-900/70 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Context & Situation</h3>
              <span className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Game</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-xs text-slate-400">
                <span className="uppercase tracking-[0.2em]">Quarter</span>
                <select
                  name="quarter"
                  className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <option value="">--</option>
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
                  className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                <span className="uppercase tracking-[0.2em]">Drive #</span>
                <input
                  name="driveNumber"
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="space-y-1 text-xs text-slate-400">
                <span className="uppercase tracking-[0.2em]">Down</span>
                <select
                  name="down"
                  className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
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
                  className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                <span className="uppercase tracking-[0.2em]">Ball on</span>
                <input
                  name="ballOn"
                  placeholder="O35"
                  className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                />
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                <span className="uppercase tracking-[0.2em]">Hash</span>
                <select
                  name="hashMark"
                  className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {hashOptions.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-900/70 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Play Type</h3>
              <span className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Flow</span>
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              <label className="flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="radio"
                  name="play_family"
                  value="RUN"
                  checked={playFamily === 'RUN'}
                  onChange={() => setPlayFamily('RUN')}
                  className="accent-brand"
                />
                Run
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="radio"
                  name="play_family"
                  value="PASS"
                  checked={playFamily === 'PASS' && passResult !== 'SCREEN'}
                  onChange={() => {
                    setPlayFamily('PASS')
                    setPassResult('')
                  }}
                  className="accent-brand"
                />
                Pass
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="radio"
                  name="play_family"
                  value="RPO"
                  checked={playFamily === 'RPO'}
                  onChange={() => setPlayFamily('RPO')}
                  className="accent-brand"
                />
                RPO
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="radio"
                  name="play_family"
                  value="PASS"
                  checked={playFamily === 'PASS' && passResult === 'SCREEN'}
                  onChange={() => {
                    setPlayFamily('PASS')
                    setPassResult('SCREEN')
                  }}
                  className="accent-brand"
                />
                Trick / Screen
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="radio"
                  name="play_family"
                  value="SPECIAL_TEAMS"
                  checked={playFamily === 'SPECIAL_TEAMS'}
                  onChange={() => setPlayFamily('SPECIAL_TEAMS')}
                  className="accent-brand"
                />
                Special Teams
              </label>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-900/70 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Pre-snap Structure</h3>
              <span className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Alignments</span>
            </div>

            {unit !== 'SPECIAL_TEAMS' && (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">Offensive personnel</span>
                    <select
                      name="offensive_personnel_code"
                      className={`w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand ${
                        inlineErrors.offensive_personnel_code ? 'border-red-500' : ''
                      }`}
                      defaultValue=""
                      onChange={(e) => setSelectedPersonnel(e.target.value)}
                    >
                      <option value="" disabled>
                        Select personnel
                      </option>
                      {offensePersonnel.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">Formation</span>
                    <select
                      name="offensive_formation_id"
                      className={`w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand ${
                        inlineErrors.offensive_formation_id ? 'border-red-500' : ''
                      }`}
                      defaultValue=""
                      onChange={(e) => setSelectedFormation(e.target.value)}
                    >
                      <option value="" disabled>
                        Select formation
                      </option>
                      {(filteredFormations.length > 0 ? filteredFormations : offenseFormationsUnique).map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.formation} ({f.personnel}p{f.family ? ` • ${f.family}` : ''})
                        </option>
                      ))}
                    </select>
                    <input
                      type="hidden"
                      name="offensive_formation_label"
                      value={offenseFormations.find((f) => f.id === selectedFormation)?.formation || ''}
                    />
                    {inlineErrors.offensive_formation_id && (
                      <p className="text-[0.7rem] text-red-400">{inlineErrors.offensive_formation_id}</p>
                    )}
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">Backfield</span>
                    <select
                      name="backfield_code"
                      className={`w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand ${
                        inlineErrors.backfield_code ? 'border-red-500' : ''
                      }`}
                      defaultValue=""
                      onChange={(e) => setSelectedBackfield(e.target.value)}
                    >
                      <option value="" disabled>
                        Select backfield
                      </option>
                      {backfieldOptions.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.code} ({b.backs} backs)
                        </option>
                      ))}
                    </select>
                    <input type="hidden" name="backs_count" value={selectedBackfieldMeta?.backs ?? ''} />
                    <input type="hidden" name="backfield_family" value={selectedBackfieldFamily} />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">QB alignment</span>
                    <select
                      name="qb_alignment"
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                      value={qbAlignmentValue}
                      onChange={(e) => setQbAlignment(e.target.value)}
                    >
                      <option value="UNDER_CENTER">Under center</option>
                      <option value="SHOTGUN">Shotgun</option>
                      <option value="PISTOL">Pistol</option>
                      <option value="DIRECT_SNAP">Direct snap</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">WR concept</span>
                    <select
                      name="wr_concept_id"
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                      defaultValue=""
                      onChange={(e) => setSelectedWRConcept(e.target.value)}
                    >
                      <option value="" disabled>
                        Select concept
                      </option>
                      {wrConcepts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.family || 'concept'})
                        </option>
                      ))}
                    </select>
                    <input type="hidden" name="wr_concept_label" value={selectedWRConceptMeta?.name || ''} />
                    <input type="hidden" name="wr_concept_family" value={selectedWRConceptMeta?.family || ''} />
                    <input type="hidden" name="route_tag_x" value={selectedWRConceptMeta?.routes.X || ''} />
                    <input type="hidden" name="route_tag_z" value={selectedWRConceptMeta?.routes.Z || ''} />
                    <input type="hidden" name="route_tag_y" value={selectedWRConceptMeta?.routes.Y || ''} />
                    <input type="hidden" name="route_tag_h" value={selectedWRConceptMeta?.routes.H || ''} />
                    <input type="hidden" name="route_tag_rb" value={selectedWRConceptMeta?.routes.RB || ''} />
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">QB drop</span>
                    <input
                      name="qb_drop"
                      value={selectedWRConceptMeta?.qbDrop || ''}
                      readOnly
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">Coverage beater</span>
                    <input
                      name="primary_coverage_beater"
                      value={(selectedWRConceptMeta?.coverageBeater || []).join(', ')}
                      readOnly
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">Run concept</span>
                    <select
                      name="run_concept"
                      className={`w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand ${
                        inlineErrors.run_concept ? 'border-red-500' : ''
                      }`}
                      value={runConcept}
                      onChange={(e) => setRunConcept(e.target.value)}
                      disabled={playFamily === 'PASS'}
                    >
                      <option value="">--</option>
                      {runConceptOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em]">Pass result</span>
                    <select
                      name="pass_result"
                      className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                      value={passResult}
                      onChange={(e) => setPassResult(e.target.value)}
                      disabled={playFamily === 'RUN'}
                    >
                      <option value="">--</option>
                      {passResultOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="has_shift" className="accent-brand" />
                    Shift
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="has_motion"
                      className="accent-brand"
                      checked={hasMotion}
                      onChange={(e) => handleMotionToggle(e.target.checked)}
                    />
                    Motion
                  </label>
                  <select
                    name="motion_type"
                    className="rounded-lg border border-slate-800 bg-black/40 px-2 py-2 text-xs text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                    value={motionType}
                    onChange={(e) => setMotionType(e.target.value)}
                    disabled={!hasMotion}
                  >
                    <option value="NONE">None</option>
                    <option value="JET">Jet</option>
                    <option value="FLY">Fly</option>
                    <option value="ORBIT">Orbit</option>
                    <option value="GHOST">Ghost</option>
                    <option value="SHORT">Short</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="is_rpo" className="accent-brand" />
                    RPO
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="is_play_action" className="accent-brand" />
                    Play action
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="is_shot_play" className="accent-brand" />
                    Shot play
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Defensive structure</span>
                  <select
                    name="defensive_structure_id"
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select structure
                    </option>
                    {defenseStructures.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Coverage (Pre)</span>
                  <select
                    name="coverage_shell_pre"
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                    defaultValue=""
                  >
                    <option value="">--</option>
                    {coverageShellOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Coverage (Post)</span>
                  <select
                    name="coverage_shell_post"
                    className={`w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand ${
                      inlineWarnings.coverage_shell_post ? 'border-amber-500' : ''
                    }`}
                    defaultValue=""
                  >
                    <option value="">--</option>
                    {coveragePostOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Front / Pressure</span>
                  <select
                    name="front_code"
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                    defaultValue=""
                  >
                    <option value="">--</option>
                    {frontOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Pressure tag</span>
                  <input
                    name="pressure_code"
                    placeholder="Blitz / Sim / Creeper"
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </label>
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Defensive personnel</span>
                  <input
                    name="defensive_personnel_code"
                    placeholder="Nickel, Dime, etc."
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </label>
              </div>
            </div>
          </div>

          {playFamily === 'SPECIAL_TEAMS' && (
            <div className="space-y-3 rounded-2xl border border-slate-900/70 bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">Special Teams</h3>
                <span className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Kick / Punt</span>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">ST Type</span>
                  <select
                    name="st_play_type"
                    className={`w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand ${
                      inlineErrors.st_play_type ? 'border-red-500' : ''
                    }`}
                    value={stPlayType}
                    onChange={(e) => setStPlayType(e.target.value)}
                  >
                    <option value="">--</option>
                    {stPlayTypes.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Variant</span>
                  <select
                    name="st_variant"
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                    value={stVariant}
                    onChange={(e) => setStVariant(e.target.value)}
                  >
                    {stVariants.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Return yards</span>
                  <input
                    name="st_return_yards"
                    type="number"
                    min={-99}
                    max={150}
                    value={stReturnYards}
                    onChange={(e) => setStReturnYards(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </label>
              </div>
              {stVariant === 'FAKE' && (
                <div className="space-y-2 rounded-xl border border-slate-800/70 bg-black/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Fake details (offensive)</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1 text-xs text-slate-400">
                      <span className="uppercase tracking-[0.2em]">Run concept</span>
                      <select
                        name="run_concept"
                        className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                        value={runConcept}
                        onChange={(e) => setRunConcept(e.target.value)}
                      >
                        <option value="">--</option>
                        {runConceptOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs text-slate-400">
                      <span className="uppercase tracking-[0.2em]">Pass concept</span>
                      <select
                        name="wr_concept_id"
                        className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                        value={selectedWRConcept}
                        onChange={(e) => setSelectedWRConcept(e.target.value)}
                      >
                        <option value="" disabled>
                          Select concept
                        </option>
                        {wrConcepts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.family || 'concept'})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}


          <div className="space-y-3 rounded-2xl border border-slate-900/70 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Outcome & Penalties</h3>
              <span className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Result</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-xs text-slate-400">
                <span className="uppercase tracking-[0.2em]">Play call</span>
                <input
                  name="playCall"
                  placeholder="Trips Right 92 Mesh"
                  className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                  required
                />
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                <span className="uppercase tracking-[0.2em]">Result</span>
                <input
                  name="result"
                  placeholder="Complete, +8"
                  className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-xs text-slate-400">
                <span className="uppercase tracking-[0.2em]">Yards gained</span>
                <input
                  name="gainedYards"
                  type="number"
                  min={-99}
                  max={150}
                  className={`w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand ${inlineWarnings.gainedYards ? 'border-amber-500' : ''}`}
                />
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                <span className="uppercase tracking-[0.2em]">Play result</span>
                <select
                  name="play_result_type"
                  className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                  defaultValue=""
                >
                  <option value="">--</option>
                  <option value="NORMAL">Normal</option>
                  <option value="TD">Touchdown</option>
                  <option value="SAFETY">Safety</option>
                  <option value="INT">Interception</option>
                  <option value="FUMBLE_LOST">Fumble lost</option>
                  <option value="ON_DOWNS">On downs</option>
                  <option value="PENALTY_ONLY">Penalty only</option>
                  <option value="NO_PLAY">No play</option>
                  <option value="RPO_RUN">RPO Run</option>
                  <option value="RPO_PASS">RPO Pass</option>
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-4 pt-6 text-xs text-slate-400">
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
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="first_down" value="true" className="accent-brand" />
                  First down
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="scoring_play" value="true" className="accent-brand" />
                  Scoring
                </label>
              </div>
              <label className="space-y-1 text-xs text-slate-400">
                <span className="uppercase tracking-[0.2em]">Penalty yards</span>
                <input
                  name="penalty_yards"
                  type="number"
                  min={-99}
                  max={99}
                  className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input type="checkbox" name="penalty_on_offense" value="true" className="accent-brand" />
                Penalty on offense
              </label>
            </div>

            <label className="space-y-1 text-xs text-slate-400 block">
              <span className="uppercase tracking-[0.2em]">Notes</span>
              <textarea
                name="notes"
                rows={3}
                className="w-full rounded-xl border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-brand"
                placeholder="Coverage bust, pressure from boundary..."
              />
            </label>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {errorMessage}
            </div>
          )}
          {warningMessage && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {warningMessage}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-brand px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-40"
            >
              {isPending ? 'Saving...' : 'Save & Next (Ctrl/Cmd+Enter)'}
            </button>
          </div>
        </form>
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
            <p className="text-sm text-slate-500">No plays logged yet. Start charting to populate this list.</p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-slate-900/60 bg-slate-950/50 px-4 py-3 text-sm text-slate-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Seq {event.sequence} | Q{event.quarter || '--'} {formatClock(event.clock_seconds)}
                  </span>
                  <span>
                    Down/Dist: {event.down ? `${event.down} & ${event.distance ?? '?'}` : '--'}
                  </span>
                </div>
                <div className="mt-1 font-semibold text-slate-100">
                  {event.play_call || 'Play call TBD'}
                </div>
                <div className="text-xs text-slate-400">
                  {event.result || 'Result TBD'} | Yardage: {typeof event.gained_yards === 'number' ? `${event.gained_yards}` : '--'}
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
