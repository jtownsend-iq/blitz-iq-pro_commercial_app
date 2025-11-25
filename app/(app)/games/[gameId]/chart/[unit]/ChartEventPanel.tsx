'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useCallback, useRef, useState, useTransition } from 'react'
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
  unit: 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS'
  initialEvents: EventRow[]
  nextSequence: number
  recordAction: typeof recordChartEvent
  offenseFormations: {
    personnel: string
    formation: string
    family: string
    aliases: string[]
    notes: string
  }[]
  offensePersonnel: string[]
  backfieldOptions: {
    code: string
    backs: number
    personnelGroups: string[]
    description: string
  }[]
  backfieldFamilies?: {
    backsLabel: string
    classification: string
    families: string
    defaultQBAlignment: string
  }[]
  defenseStructures: {
    name: string
    description: string
    nuances: string
    strategy: string
  }[]
  wrConcepts: {
    name: string
    family: string
    summary: string
    coverageBeater: string[]
    qbDrop: string
    primaryPersonnel: string[]
    primaryFormations: string[]
    primaryBackfield: string[]
    routes: {
      X?: string
      Z?: string
      Y?: string
      H?: string
      RB?: string
    }
  }[]
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

const clockPattern = /^([0-5]?[0-9]):([0-5][0-9])$/

function formatClock(seconds: number | null) {
  if (seconds == null) return '--'
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
  const [isPending, startTransition] = useTransition()
  const [events, setEvents] = useState<EventRow[]>(initialEvents)
  const [selectedPersonnel, setSelectedPersonnel] = useState<string>('')
  const [selectedFormation, setSelectedFormation] = useState<string>('')
  const [selectedBackfield, setSelectedBackfield] = useState<string>('')
  const [selectedWRConcept, setSelectedWRConcept] = useState<string>('')
  const [qbAlignment, setQbAlignment] = useState<string>('UNDER_CENTER')
  const [motionType, setMotionType] = useState<string>('NONE')
  const [hasMotion, setHasMotion] = useState<boolean>(false)

  const defenseNames = Array.from(new Set(defenseStructures.map((d) => d.name).filter(Boolean)))
  const coverageOptions = Array.from(
    new Set(
      defenseStructures
        .flatMap((d) => [d.name, d.strategy, d.nuances])
        .flatMap((s) => (s ? s.split(/[,/]/).map((t) => t.trim()) : []))
        .filter(Boolean)
    )
  )
  const frontOptions = defenseNames
  const wrConceptNames = wrConcepts.map((c) => c.name)
  const offenseFormationsUnique = Array.from(
    new Map(
      offenseFormations.map((f) => [`${f.personnel}|${f.formation}`, f])
    ).values()
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
      ? (backfieldFamilies.find((f: { backsLabel: string }) =>
          f.backsLabel.startsWith(`${selectedBackfieldMeta.backs}`)
        )?.classification ??
          selectedBackfieldMeta.description)
      : selectedBackfieldMeta?.description || ''
  const selectedQBAlignment =
    selectedBackfieldMeta && backfieldFamilies.length > 0
      ? (backfieldFamilies
          .find((f: { backsLabel: string }) => f.backsLabel.startsWith(`${selectedBackfieldMeta.backs}`))
          ?.defaultQBAlignment.toUpperCase()
          .replace(/\s+\/\s+/g, '_') || 'UNDER_CENTER')
      : selectedBackfieldMeta?.description.toUpperCase().includes('SHOTGUN')
      ? 'SHOTGUN'
      : selectedBackfieldMeta?.description.toUpperCase().includes('PISTOL')
      ? 'PISTOL'
      : 'UNDER_CENTER'
  const qbAlignmentValue = qbAlignment || selectedQBAlignment
  const selectedWRConceptMeta = selectedWRConcept
    ? wrConcepts.find((c) => c.name === selectedWRConcept)
    : null

  const handleMotionToggle = (checked: boolean) => {
    setHasMotion(checked)
    if (checked) {
      if (motionType === 'NONE') {
        setMotionType('JET')
      }
    } else {
      setMotionType('NONE')
    }
  }

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
    if (unit === 'OFFENSE') {
      if (!formData.get('offensive_personnel_code')) {
        setErrorMessage('Offensive personnel is required.')
        return
      }
      if (!formData.get('offensive_formation_code')) {
        setErrorMessage('Offensive formation is required.')
        return
      }
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

          {unit === 'OFFENSE' ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Offensive personnel</span>
                  <select
                    name="offensive_personnel_code"
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
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
                <input type="hidden" name="offensivePersonnel" value={selectedPersonnel} />
                {selectedPersonnel && (
                  <p className="text-[0.7rem] text-slate-500">
                    Personnel code: {selectedPersonnel}
                  </p>
                )}
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Formation</span>
                  <select
                    name="offensive_formation_code"
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
                defaultValue=""
                onChange={(e) => setSelectedFormation(e.target.value)}
              >
                <option value="" disabled>
                  Select formation
                </option>
                {(filteredFormations.length > 0 ? filteredFormations : offenseFormationsUnique).map((f, idx) => (
                  <option key={`${f.personnel}-${f.formation}-${idx}`} value={f.formation}>
                    {f.formation} ({f.personnel}p{f.family ? ` • ${f.family}` : ''})
                  </option>
                ))}
                  </select>
                </label>
                <input type="hidden" name="formation" value={selectedFormation} />
                {selectedFormation && (
                  <p className="text-[0.7rem] text-slate-500">
                    {offenseFormations.find((f) => f.formation === selectedFormation)?.notes || ''}
                  </p>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Backfield</span>
                  <select
                    name="backfield_code"
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
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
                </label>
                <input type="hidden" name="backs_count" value={selectedBackfieldMeta?.backs ?? ''} />
                <input type="hidden" name="backfield_family" value={selectedBackfieldFamily} />
                <input type="hidden" name="backfield_variant" value={selectedBackfield || ''} />
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">QB alignment</span>
                  <select
                    name="qb_alignment"
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
                value={qbAlignmentValue}
                onChange={(e) => setQbAlignment(e.target.value)}
              >
                <option value="UNDER_CENTER">Under center</option>
                <option value="SHOTGUN">Shotgun</option>
                <option value="PISTOL">Pistol</option>
                    <option value="DIRECT_SNAP">Direct snap</option>
                  </select>
                </label>
                <input type="hidden" name="hback_role" value={selectedBackfieldMeta ? 'NONE' : ''} />
                {selectedBackfieldMeta && (
                  <p className="text-[0.7rem] text-slate-500">{selectedBackfieldMeta.description}</p>
                )}
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">WR concept</span>
                  <select
                    name="wr_concept_code"
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
                    defaultValue=""
                    onChange={(e) => setSelectedWRConcept(e.target.value)}
                  >
                    <option value="" disabled>
                      Select concept
                    </option>
                    {wrConcepts.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.family || 'concept'})
                      </option>
                    ))}
                  </select>
                </label>
                <input type="hidden" name="wr_concept_family" value={selectedWRConceptMeta?.family || ''} />
                <input type="hidden" name="route_tag_x" value={selectedWRConceptMeta?.routes.X || ''} />
                <input type="hidden" name="route_tag_z" value={selectedWRConceptMeta?.routes.Z || ''} />
                <input type="hidden" name="route_tag_y" value={selectedWRConceptMeta?.routes.Y || ''} />
                <input type="hidden" name="route_tag_h" value={selectedWRConceptMeta?.routes.H || ''} />
                <input type="hidden" name="route_tag_rb" value={selectedWRConceptMeta?.routes.RB || ''} />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">QB drop</span>
                  <input
                    name="qb_drop"
                    value={selectedWRConceptMeta?.qbDrop || ''}
                    readOnly
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Coverage beater</span>
              <input
                name="primary_coverage_beater"
                value={(selectedWRConceptMeta?.coverageBeater || []).join(', ')}
                readOnly
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <div className="flex items-center gap-4 pt-7 text-xs text-slate-400">
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
                className="rounded-lg border border-slate-800 bg-black/40 px-2 py-2 text-xs text-slate-100"
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
            </div>
          </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <input type="checkbox" name="is_rpo" className="accent-brand" />
                  RPO
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <input type="checkbox" name="is_play_action" className="accent-brand" />
                  Play action
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <input type="checkbox" name="is_shot_play" className="accent-brand" />
                  Shot play
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Defensive structure</span>
                  <select
                    name="formation"
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select structure
                    </option>
                    {defenseStructures.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Coverage</span>
                  <input
                    list="coverageOptions"
                    name="coverage"
                    placeholder="Cover 3, Quarters, etc."
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Pressure / Front</span>
                  <input
                    list="frontOptions"
                    name="front"
                    placeholder="Even, Odd, Bear, Mint, etc."
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
                <label className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">Defensive personnel</span>
                  <input
                    name="defensivePersonnel"
                    placeholder="Nickel, Dime, etc."
                    className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
              </div>
            </>
          )}

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

          <div className="grid gap-3 md:grid-cols-3">
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
            <label className="space-y-1 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">Play result</span>
              <select
                name="play_result_type"
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
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
              </select>
            </label>
            <div className="flex items-center gap-4 pt-6 text-xs text-slate-400">
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
            <div className="flex items-center gap-4 text-xs text-slate-400">
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
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400 pt-6">
              <input type="checkbox" name="penalty_on_offense" value="true" className="accent-brand" />
              Penalty on offense
            </label>
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
        <datalist id="wrConceptOptions">
          {wrConceptNames.map((option) => (
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
                    Seq {event.sequence} | Q{event.quarter || '--'} {formatClock(event.clock_seconds)}
                  </span>
                  <span>
                    Down/Dist:{' '}
                    {event.down ? `${event.down} & ${event.distance ?? '?'}` : '--'}
                  </span>
                </div>
                <div className="mt-1 font-semibold text-slate-100">
                  {event.play_call || 'Play call TBD'}
                </div>
                <div className="text-xs text-slate-400">
                  {event.result || 'Result TBD'} | Yardage:{' '}
                  {typeof event.gained_yards === 'number' ? `${event.gained_yards}` : '--'}
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
