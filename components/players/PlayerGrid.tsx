'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { formatDate } from '@/utils/date'

type PlayerRecord = {
  id: string
  first_name: string | null
  last_name: string | null
  jersey_number: string | null
  position: string | null
  unit: string | null
  class_year: number | null
  status: string | null
  status_reason: string | null
  return_target_date: string | null
  pitch_count: number | null
  packages: string[] | null
  scout_team: boolean | null
  tags: string[] | null
}

type PlayerNote = {
  id: string
  player_id: string
  body: string
  tags: string[]
  created_at: string
}

type PlayerGoal = {
  id: string
  player_id: string
  goal: string
  status: string
  due_date: string | null
  created_at: string
}

const statusStyles: Record<string, string> = {
  READY: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  LIMITED: 'bg-amber-500/15 text-amber-200 border border-amber-500/30',
  OUT: 'bg-red-500/15 text-red-200 border border-red-500/30',
  QUESTIONABLE: 'bg-sky-500/15 text-sky-200 border border-sky-500/30',
}

const statusLabels: Record<string, string> = {
  READY: 'Ready',
  LIMITED: 'Limited',
  OUT: 'Out',
  QUESTIONABLE: 'Questionable',
}

function normalize(val?: string | null) {
  return (val ?? '').trim()
}

export default function PlayerGrid({
  players,
  displayTimezone,
}: {
  players: PlayerRecord[]
  displayTimezone: string
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [positionFilter, setPositionFilter] = useState<string>('ALL')
  const [classFilter, setClassFilter] = useState<string>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusDraft, setStatusDraft] = useState<string>('READY')
  const [statusReasonDraft, setStatusReasonDraft] = useState<string>('')
  const [returnDateDraft, setReturnDateDraft] = useState<string>('')
  const [pitchDraft, setPitchDraft] = useState<string>('')
  const [packagesDraft, setPackagesDraft] = useState<string>('')
  const [tagsDraft, setTagsDraft] = useState<string>('')
  const [scoutDraft, setScoutDraft] = useState<boolean>(false)
  const [noteBody, setNoteBody] = useState<string>('')
  const [noteTags, setNoteTags] = useState<string>('')
  const [goalText, setGoalText] = useState<string>('')
  const [goalDue, setGoalDue] = useState<string>('')
  const [actionMessage, setActionMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [pending, setPending] = useState<boolean>(false)
  const [notes, setNotes] = useState<PlayerNote[]>([])
  const [goals, setGoals] = useState<PlayerGoal[]>([])
  const [notesError, setNotesError] = useState<string | null>(null)
  const [goalsError, setGoalsError] = useState<string | null>(null)
  const [notesOffset, setNotesOffset] = useState(0)
  const [goalsOffset, setGoalsOffset] = useState(0)
  const [notesHasMore, setNotesHasMore] = useState(false)
  const [goalsHasMore, setGoalsHasMore] = useState(false)
  const [notesLoading, setNotesLoading] = useState(false)
  const [goalsLoading, setGoalsLoading] = useState(false)
  const pageSize = 20
  const { ref: notesSentinelRef, inView: notesInView } = useInView({ threshold: 0.1 })
  const { ref: goalsSentinelRef, inView: goalsInView } = useInView({ threshold: 0.1 })

  const positions = useMemo(() => {
    const set = new Set<string>()
    players.forEach((p) => {
      const pos = normalize(p.position)
      if (pos) set.add(pos)
    })
    return Array.from(set).sort()
  }, [players])

  const classYears = useMemo(() => {
    const set = new Set<number>()
    players.forEach((p) => {
      if (typeof p.class_year === 'number') set.add(p.class_year)
    })
    return Array.from(set).sort((a, b) => a - b)
  }, [players])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return players.filter((p) => {
      const name = `${normalize(p.first_name)} ${normalize(p.last_name)}`.toLowerCase()
      const jersey = normalize(p.jersey_number).toLowerCase()
      const matchesSearch =
        term.length === 0 || name.includes(term) || jersey.startsWith(term) || name.startsWith(term)

      const matchesStatus = statusFilter === 'ALL' || normalize(p.status) === statusFilter
      const matchesPosition =
        positionFilter === 'ALL' || normalize(p.position).toUpperCase() === positionFilter.toUpperCase()
      const matchesClass = classFilter === 'ALL' || p.class_year?.toString() === classFilter

      return matchesSearch && matchesStatus && matchesPosition && matchesClass
    })
  }, [players, search, statusFilter, positionFilter, classFilter])

  const [overrides, setOverrides] = useState<Record<string, Partial<PlayerRecord>>>({})
  const selectedBase = filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null
  const selected = useMemo(
    () =>
      selectedBase
        ? ({
            ...selectedBase,
            ...(overrides[selectedBase.id] ?? {}),
          } as PlayerRecord)
        : null,
    [selectedBase, overrides]
  )

  useEffect(() => {
    if (!selected) return
    setStatusDraft(normalize(selected.status) || 'READY')
    setStatusReasonDraft(selected.status_reason ?? '')
    setReturnDateDraft(selected.return_target_date ?? '')
    setPitchDraft(selected.pitch_count?.toString() ?? '')
    setPackagesDraft((selected.packages ?? []).join(', '))
    setTagsDraft((selected.tags ?? []).join(', '))
    setScoutDraft(Boolean(selected.scout_team))
    setNoteBody('')
    setNoteTags('')
    setGoalText('')
    setGoalDue('')
    setActionMessage('')
    setErrorMessage('')
  }, [selected])

  useEffect(() => {
    let cancelled = false
    async function fetchNotesGoals(playerId: string) {
      if (cancelled) return
      setNotesError(null)
      setGoalsError(null)
      setNotesLoading(true)
      setGoalsLoading(true)
      try {
        const [notesRes, goalsRes] = await Promise.all([
          fetch(`/api/players/${playerId}/notes?limit=${pageSize}&offset=0`),
          fetch(`/api/players/${playerId}/goals?limit=${pageSize}&offset=0`),
        ])
        const notesJson = await notesRes.json()
        const goalsJson = await goalsRes.json()
        if (!notesRes.ok) {
          setNotesError(notesJson.error || 'Unable to load notes')
          setNotes([])
          setNotesHasMore(false)
        } else if (!cancelled) {
          setNotes(notesJson.data ?? [])
          setNotesOffset((notesJson.data?.length ?? 0))
          setNotesHasMore((notesJson.data?.length ?? 0) >= pageSize)
        }
        if (!goalsRes.ok) {
          setGoalsError(goalsJson.error || 'Unable to load goals')
          setGoals([])
          setGoalsHasMore(false)
        } else if (!cancelled) {
          setGoals(goalsJson.data ?? [])
          setGoalsOffset((goalsJson.data?.length ?? 0))
          setGoalsHasMore((goalsJson.data?.length ?? 0) >= pageSize)
        }
      } catch {
        if (!cancelled) {
          setNotesError('Unable to load notes')
          setGoalsError('Unable to load goals')
          setNotes([])
          setGoals([])
          setNotesHasMore(false)
          setGoalsHasMore(false)
        }
      } finally {
        if (!cancelled) {
          setNotesLoading(false)
          setGoalsLoading(false)
        }
      }
    }
    if (selectedBase?.id) {
      fetchNotesGoals(selectedBase.id)
    } else {
      setNotes([])
      setGoals([])
      setNotesHasMore(false)
      setGoalsHasMore(false)
    }
    return () => {
      cancelled = true
    }
  }, [selectedBase?.id])

  const loadMoreNotes = useCallback(async () => {
    if (!selectedBase || notesLoading || !notesHasMore) return
    setNotesLoading(true)
    try {
      const res = await fetch(
        `/api/players/${selectedBase.id}/notes?limit=${pageSize}&offset=${notesOffset}`
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Unable to load more notes')
      const data: PlayerNote[] = json.data ?? []
      setNotes((prev) => [...prev, ...data])
      setNotesOffset((prev) => prev + data.length)
      setNotesHasMore(data.length >= pageSize)
    } catch {
      setNotesError('Unable to load more notes')
    } finally {
      setNotesLoading(false)
    }
  }, [selectedBase, notesLoading, notesHasMore, notesOffset, pageSize])

  const loadMoreGoals = useCallback(async () => {
    if (!selectedBase || goalsLoading || !goalsHasMore) return
    setGoalsLoading(true)
    try {
      const res = await fetch(
        `/api/players/${selectedBase.id}/goals?limit=${pageSize}&offset=${goalsOffset}`
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Unable to load more goals')
      const data: PlayerGoal[] = json.data ?? []
      setGoals((prev) => [...prev, ...data])
      setGoalsOffset((prev) => prev + data.length)
      setGoalsHasMore(data.length >= pageSize)
    } catch {
      setGoalsError('Unable to load more goals')
    } finally {
      setGoalsLoading(false)
    }
  }, [selectedBase, goalsLoading, goalsHasMore, goalsOffset, pageSize])

  useEffect(() => {
    if (notesInView) {
      loadMoreNotes()
    }
  }, [notesInView, loadMoreNotes])

  useEffect(() => {
    if (goalsInView) {
      loadMoreGoals()
    }
  }, [goalsInView, loadMoreGoals])

  async function handleUpdatePlayer() {
    if (!selectedBase) return
    setPending(true)
    setErrorMessage('')
    setActionMessage('')
    const prevOverride = overrides[selectedBase.id] || undefined
    try {
      const trimmedPitch = pitchDraft.trim()
      const pitchCount = trimmedPitch === '' ? null : Number(trimmedPitch)
      if (pitchCount !== null && (Number.isNaN(pitchCount) || pitchCount < 0)) {
        throw new Error('Pitch count must be a non-negative number')
      }

      const payload = {
        playerId: selectedBase.id,
        status: statusDraft,
        statusReason: statusReasonDraft,
        returnTargetDate: returnDateDraft || null,
        pitchCount,
        packages: packagesDraft
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        tags: tagsDraft
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        scoutTeam: scoutDraft,
      }

      const res = await fetch('/api/players/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update player')

      setOverrides((prev) => ({
        ...prev,
        [selectedBase.id]: {
          status: payload.status,
          status_reason: payload.statusReason,
          return_target_date: payload.returnTargetDate,
          pitch_count: payload.pitchCount === null ? null : payload.pitchCount,
          packages: payload.packages,
          tags: payload.tags,
          scout_team: payload.scoutTeam,
        },
      }))

      setActionMessage('Player updated')
    } catch (err) {
      setOverrides((prev) => {
        const next = { ...prev }
        if (prevOverride) {
          next[selectedBase.id] = prevOverride
        } else {
          delete next[selectedBase.id]
        }
        return next
      })
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update player')
    } finally {
      setPending(false)
    }
  }

  async function handleAddNote() {
    if (!selectedBase) return
    if (!noteBody.trim()) {
      setErrorMessage('Note body is required')
      return
    }
    setPending(true)
    setErrorMessage('')
    setActionMessage('')
    const optimisticId: string = crypto.randomUUID()
    try {
      const res = await fetch(`/api/players/${selectedBase.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: noteBody.trim(),
          tags: noteTags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add note')

      setNotes((prev) => [
        {
          id: optimisticId,
          player_id: selectedBase.id,
          body: noteBody.trim(),
          tags: noteTags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])

      setNoteBody('')
      setNoteTags('')
      setActionMessage('Note added')
    } catch (err) {
      setNotes((prev) => prev.filter((n) => n.id !== optimisticId))
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add note')
    } finally {
      setPending(false)
    }
  }

  async function handleAddGoal() {
    if (!selectedBase) return
    if (!goalText.trim()) {
      setErrorMessage('Goal text is required')
      return
    }
    setPending(true)
    setErrorMessage('')
    setActionMessage('')
    const optimisticId: string = crypto.randomUUID()
    try {
      const res = await fetch(`/api/players/${selectedBase.id}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goalText.trim(),
          dueDate: goalDue || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add goal')

      setGoals((prev) => [
        {
          id: optimisticId,
          player_id: selectedBase.id,
          goal: goalText.trim(),
          status: 'open',
          due_date: goalDue || null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])

      setGoalText('')
      setGoalDue('')
      setActionMessage('Goal added')
    } catch (err) {
      setGoals((prev) => prev.filter((g) => g.id !== optimisticId))
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add goal')
    } finally {
      setPending(false)
    }
  }

  const selectedNotes = selectedBase ? notes.filter((n) => n.player_id === selectedBase.id).slice(0, 3) : []
  const selectedGoals = selectedBase ? goals.filter((g) => g.player_id === selectedBase.id).slice(0, 3) : []

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or jersey #"
          className="w-full rounded-xl border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full rounded-xl border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
        >
          <option value="ALL">Status: All</option>
          <option value="READY">Ready</option>
          <option value="LIMITED">Limited</option>
          <option value="QUESTIONABLE">Questionable</option>
          <option value="OUT">Out</option>
        </select>
        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="w-full rounded-xl border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
        >
          <option value="ALL">Position: All</option>
          {positions.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="w-full rounded-xl border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
        >
          <option value="ALL">Class: All</option>
          {classYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-surface-muted/40 p-6 space-y-2 text-sm text-slate-300">
          <p className="font-semibold text-slate-100">No players match your filters</p>
          <p>Try clearing filters or adjusting position/status/class filters above.</p>
          <p className="text-xs text-slate-500">
            If your roster is empty, add players via Settings &gt; Roster to see them here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1.6fr,1fr]">
          {(notesError || goalsError) && (
            <div className="lg:col-span-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
              {notesError ? <p>Notes unavailable: {notesError}</p> : null}
              {goalsError ? <p>Goals unavailable: {goalsError}</p> : null}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((p) => {
              const status = normalize(p.status) || 'READY'
              const statusClass = statusStyles[status] ?? statusStyles.READY
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`rounded-2xl border ${
                    selected?.id === p.id ? 'border-brand/70' : 'border-slate-800'
                  } bg-black/40 p-4 text-left transition hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/40`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-100">
                        {p.first_name} {p.last_name}{' '}
                        {p.jersey_number ? <span className="text-slate-500">#{p.jersey_number}</span> : null}
                      </p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {p.position || '—'} {p.unit ? `• ${p.unit}` : ''}{' '}
                        {p.class_year ? `• ${p.class_year}` : ''}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[0.7rem] font-semibold ${statusClass}`}>
                      {statusLabels[status] ?? status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[0.78rem] text-slate-300">
                    <div className="rounded-lg border border-slate-800 bg-black/30 px-3 py-2">
                      <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">Pitch</p>
                      <p className="font-semibold">{p.pitch_count ?? '—'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-black/30 px-3 py-2">
                      <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">Scout</p>
                      <p className="font-semibold">{p.scout_team ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {(p.packages ?? []).map((pkg) => (
                      <span
                        key={pkg}
                        className="rounded-full bg-slate-800/70 px-2 py-1 text-[0.7rem] text-slate-200 border border-slate-700"
                      >
                        {pkg}
                      </span>
                    ))}
                    {(p.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-900/70 px-2 py-1 text-[0.7rem] text-slate-400 border border-slate-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          {selected ? (
            <aside className="rounded-3xl border border-slate-900/70 bg-surface-muted/50 p-4 space-y-4">
              <header className="space-y-1">
                <p className="text-sm font-semibold text-slate-100">
                  {selected.first_name} {selected.last_name}{' '}
                  {selected.jersey_number ? <span className="text-slate-500">#{selected.jersey_number}</span> : null}
                </p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {selected.position || '—'} {selected.unit ? `• ${selected.unit}` : ''}{' '}
                  {selected.class_year ? `• ${selected.class_year}` : ''}
                </p>
              </header>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-slate-800 bg-black/30 p-3 space-y-2">
                  <label className="space-y-1 block text-xs text-slate-300">
                    <span className="uppercase tracking-[0.18em] text-slate-500">Status</span>
                    <select
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-black/30 px-2 py-1 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    >
                      <option value="READY">Ready</option>
                      <option value="LIMITED">Limited</option>
                      <option value="QUESTIONABLE">Questionable</option>
                      <option value="OUT">Out</option>
                    </select>
                  </label>
                  <label className="space-y-1 block text-xs text-slate-300">
                    <span className="uppercase tracking-[0.18em] text-slate-500">Status reason</span>
                    <input
                      value={statusReasonDraft}
                      onChange={(e) => setStatusReasonDraft(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-black/30 px-2 py-1 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                </div>
                <div className="rounded-xl border border-slate-800 bg-black/30 p-3 space-y-2">
                  <label className="space-y-1 block text-xs text-slate-300">
                    <span className="uppercase tracking-[0.18em] text-slate-500">Return target</span>
                    <input
                      type="date"
                      value={returnDateDraft}
                      onChange={(e) => setReturnDateDraft(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-black/30 px-2 py-1 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                    {returnDateDraft ? (
                      <span className="text-[0.7rem] text-slate-500">
                        Displays in {displayTimezone}: {formatDate(returnDateDraft, displayTimezone)}
                      </span>
                    ) : null}
                  </label>
                  <label className="space-y-1 block text-xs text-slate-300">
                    <span className="uppercase tracking-[0.18em] text-slate-500">Pitch count</span>
                    <input
                      type="number"
                      min={0}
                      value={pitchDraft}
                      onChange={(e) => setPitchDraft(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-black/30 px-2 py-1 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={scoutDraft}
                      onChange={(e) => setScoutDraft(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-black/40 text-brand focus:ring-brand"
                    />
                    <span className="uppercase tracking-[0.18em] text-slate-500">Scout team</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Packages</p>
                <div className="flex flex-wrap gap-2">
                  {(selected.packages ?? []).length === 0 ? (
                    <span className="text-xs text-slate-500">
                      No packages yet. Add situational roles like 3rd-down rush, short yardage, or KO.
                    </span>
                  ) : (
                    (selected.packages ?? []).map((pkg) => (
                      <span
                        key={pkg}
                        className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 text-[0.7rem] text-emerald-200"
                      >
                        {pkg}
                      </span>
                    ))
                  )}
                </div>
                <input
                  value={packagesDraft}
                  onChange={(e) => setPackagesDraft(e.target.value)}
                  placeholder="Comma-separated packages"
                  className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
                <p className="text-[0.7rem] text-slate-500">
                  Tip: use consistent names for quick filtering (e.g., &quot;3rd down&quot;, &quot;KO&quot;, &quot;short yardage&quot;).
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {(selected.tags ?? []).length === 0 ? (
                    <span className="text-xs text-slate-500">
                      No tags yet. Add tags like speed, leadership, rehab, leverage, or matchup cue.
                    </span>
                  ) : (
                    (selected.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-900/70 border border-slate-700 px-2 py-1 text-[0.7rem] text-slate-200"
                      >
                        {tag}
                      </span>
                    ))
                  )}
                </div>
                <input
                  value={tagsDraft}
                  onChange={(e) => setTagsDraft(e.target.value)}
                  placeholder="Comma-separated tags"
                  className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
                <p className="text-[0.7rem] text-slate-500">
                  Suggestions: speed, leadership, rehab, leverage, matchup. Tags help filter quickly.
                </p>
              </div>

              <button
                onClick={handleUpdatePlayer}
                disabled={pending}
                className="w-full rounded-full bg-brand text-black px-4 py-2 text-sm font-semibold tracking-[0.18em] hover:bg-brand-soft transition disabled:opacity-60"
              >
                {pending ? 'Saving...' : 'Save player updates'}
              </button>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Recent notes</p>
                  {selectedNotes.length === 0 ? (
                    <p className="text-xs text-slate-500">No notes yet. Add coach feedback or rehab updates.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedNotes.map((n) => (
                        <div key={n.id} className="rounded-lg border border-slate-800 bg-black/30 p-2 text-xs text-slate-200">
                          <p className="font-semibold">{formatDate(n.created_at, displayTimezone)}</p>
                          <p className="text-slate-300">{n.body}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(n.tags ?? []).map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-slate-900/70 border border-slate-700 px-2 py-0.5 text-[0.65rem] text-slate-200"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div ref={notesSentinelRef} className="h-6">
                    {notesLoading ? <p className="text-[0.7rem] text-slate-500">Loading…</p> : null}
                    {notesError ? <p className="text-xs text-amber-400">{notesError}</p> : null}
                    {!notesHasMore && !notesLoading ? (
                      <p className="text-[0.7rem] text-slate-600">End of notes</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Recent goals</p>
                  {selectedGoals.length === 0 ? (
                    <p className="text-xs text-slate-500">No goals yet. Add a weekly or seasonal focus.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedGoals.map((g) => (
                        <div key={g.id} className="rounded-lg border border-slate-800 bg-black/30 p-2 text-xs text-slate-200">
                          <p className="font-semibold">{g.goal}</p>
                          <p className="text-slate-400">
                            Status: {g.status} {g.due_date ? `• Due ${formatDate(g.due_date, displayTimezone)}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div ref={goalsSentinelRef} className="h-6">
                    {goalsLoading ? <p className="text-[0.7rem] text-slate-500">Loading…</p> : null}
                    {goalsError ? <p className="text-xs text-amber-400">{goalsError}</p> : null}
                    {!goalsHasMore && !goalsLoading ? (
                      <p className="text-[0.7rem] text-slate-600">End of goals</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Add note</p>
                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="Technique, mindset, rehab, availability notes"
                    className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                  />
                  <input
                    value={noteTags}
                    onChange={(e) => setNoteTags(e.target.value)}
                    placeholder="Comma-separated tags (e.g., tech, rehab, mindset)"
                    className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={pending}
                    className="w-full rounded-full border border-slate-700 text-slate-100 px-4 py-2 text-sm font-semibold tracking-[0.18em] hover:border-brand hover:text-brand transition disabled:opacity-60"
                  >
                    {pending ? 'Working...' : 'Add note'}
                  </button>
                  <p className="text-[0.7rem] text-slate-500">
                    Capture quick coach feedback, rehab updates, or mindset notes. Tags help you find themes later.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">Add goal</p>
                  <input
                    value={goalText}
                    onChange={(e) => setGoalText(e.target.value)}
                    placeholder="Goal (e.g., Reduce mental errors, improve pad level)"
                    className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                  />
                  <input
                    type="date"
                    value={goalDue}
                    onChange={(e) => setGoalDue(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                  />
                  <button
                    onClick={handleAddGoal}
                    disabled={pending}
                    className="w-full rounded-full border border-slate-700 text-slate-100 px-4 py-2 text-sm font-semibold tracking-[0.18em] hover:border-brand hover:text-brand transition disabled:opacity-60"
                  >
                    {pending ? 'Working...' : 'Add goal'}
                  </button>
                  <p className="text-[0.7rem] text-slate-500">
                    Set weekly or seasonal goals to align the player and staff (e.g., technique, assignment consistency, conditioning).
                  </p>
                </div>

                {actionMessage ? (
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[0.8rem] text-emerald-200">
                    {actionMessage}
                  </div>
                ) : null}
                {errorMessage ? (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[0.8rem] text-red-200">
                    {errorMessage}
                  </div>
                ) : null}
              </div>
            </aside>
          ) : null}
        </div>
      )}
    </div>
  )
}
