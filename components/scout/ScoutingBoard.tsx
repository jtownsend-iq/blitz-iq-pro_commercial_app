'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { trackEvent } from '@/utils/telemetry'

type Opponent = { opponent: string | null; season: string | null }
type ImportRow = {
  id: string
  opponent_name: string
  season: string | null
  status: string
  created_at: string
  original_filename: string | null
  file_hash: string | null
  error_log?: Record<string, unknown> | null
}

type Tendency = {
  formation: string | null
  personnel: string | null
  play_family: string | null
  down_bucket: string | null
  distance_bucket: string | null
  hash: string | null
  samples: number
  explosive_rate: number
  turnover_rate: number
  avg_gain: number
}

type RecentPlay = {
  id: string
  created_at: string
  phase: 'OFFENSE' | 'DEFENSE'
  down: number | null
  distance: number | null
  hash: string | null
  field_position: number | null
  quarter: number | null
  time_remaining_seconds: number | null
  formation: string | null
  personnel: string | null
  play_family: string | null
  result: string | null
  gained_yards: number | null
  explosive: boolean
  turnover: boolean
  tags: string[]
}

type PreviewRow = {
  raw_row: Record<string, unknown>
  errors: string[]
}

type Props = {
  teamId: string
  opponents: Opponent[]
  imports: ImportRow[]
}

type SavedView = {
  id: string
  name: string
  opponent_name: string | null
  season: string | null
  filters: Record<string, unknown>
}

export default function ScoutingBoard({ teamId, opponents, imports }: Props) {
  const defaultOpponentEntry = opponents.find((o) => o.opponent) ?? opponents[0] ?? { opponent: '', season: '' }
  const [opponent, setOpponent] = useState(defaultOpponentEntry.opponent ?? '')
  const [season, setSeason] = useState(defaultOpponentEntry.season ?? '')
  const [phase, setPhase] = useState<'OFFENSE' | 'DEFENSE' | 'ALL'>('ALL')
  const [tagFilter, setTagFilter] = useState('')
  const [tagLogic, setTagLogic] = useState<'AND' | 'OR'>('OR')
  const [hashFilter, setHashFilter] = useState<string>('ALL')
  const [fieldBucket, setFieldBucket] = useState<string>('ALL')
  const [tendencies, setTendencies] = useState<Tendency[]>([])
  const [recent, setRecent] = useState<RecentPlay[]>([])
  const [recentOffset, setRecentOffset] = useState(0)
  const [recentEnd, setRecentEnd] = useState(false)
  const [loadingTendencies, setLoadingTendencies] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(false)
  const [tendencyError, setTendencyError] = useState<string | null>(null)
  const [recentError, setRecentError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [viewError, setViewError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadInfo, setUploadInfo] = useState<{ importId: string; rows: number; rowsWithErrors: number } | null>(null)
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [committing, setCommitting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [errorCsvUrl, setErrorCsvUrl] = useState<string | null>(null)
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [viewName, setViewName] = useState('')
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [savingView, setSavingView] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  const track = useCallback(
    (name: string, payload: Record<string, unknown> = {}) =>
      trackEvent(name, { ...payload, opponent: opponent || null, season: season || null, phase }, 'scouting_board'),
    [opponent, season, phase]
  )

  const baseExportParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('teamId', teamId)
    if (opponent) params.set('opponent', opponent)
    if (season) params.set('season', season)
    if (phase !== 'ALL') params.set('phase', phase)
    if (tagFilter) params.set('tags', tagFilter)
    if (tagLogic) params.set('tagLogic', tagLogic)
    if (hashFilter !== 'ALL') params.set('hash', hashFilter)
    if (fieldBucket !== 'ALL') params.set('fieldBucket', fieldBucket)
    return params.toString()
  }, [teamId, opponent, season, phase, tagFilter, tagLogic, hashFilter, fieldBucket])

  const tendencyExportUrl = opponent && season ? `/api/scout/export/tendencies?${baseExportParams}` : ''
  const recentExportUrl = opponent && season ? `/api/scout/export/recent?${baseExportParams}` : ''

  const clearFilters = () => {
    setTagFilter('')
    setTagLogic('OR')
    setHashFilter('ALL')
    setFieldBucket('ALL')
    setSelectedViewId(null)
    setViewName('')
    track('scouting_filters_cleared')
  }
  useEffect(() => {
    const opp = searchParams.get('opponent')
    const seas = searchParams.get('season')
    const ph = searchParams.get('phase')
    const tags = searchParams.get('tags')
    const logic = searchParams.get('tagLogic')
    const hash = searchParams.get('hash')
    const field = searchParams.get('fieldBucket')
    if (opp) setOpponent(opp)
    if (seas) setSeason(seas)
    if (ph === 'OFFENSE' || ph === 'DEFENSE' || ph === 'ALL') setPhase(ph)
    if (tags) setTagFilter(tags)
    if (logic === 'AND' || logic === 'OR') setTagLogic(logic)
    if (hash) setHashFilter(hash)
    if (field) setFieldBucket(field)
  }, [searchParams])

  useEffect(() => {
    const params = new URLSearchParams()
    params.set('teamId', teamId)
    if (opponent) params.set('opponent', opponent)
    if (season) params.set('season', season)
    if (phase !== 'ALL') params.set('phase', phase)
    if (tagFilter) params.set('tags', tagFilter)
    if (tagLogic) params.set('tagLogic', tagLogic)
    if (hashFilter !== 'ALL') params.set('hash', hashFilter)
    if (fieldBucket !== 'ALL') params.set('fieldBucket', fieldBucket)
    router.replace(`?${params.toString()}`)
  }, [teamId, opponent, season, phase, tagFilter, tagLogic, hashFilter, fieldBucket, router])
  useEffect(() => {
    if (!opponent || !season) {
      setTendencies([])
      setRecent([])
      setTendencyError(null)
      setRecentError(null)
      return
    }
    const params = new URLSearchParams({
      teamId,
      opponent,
      season,
    })
    if (phase !== 'ALL') params.set('phase', phase)
    if (tagFilter) params.set('tags', tagFilter)
    if (tagLogic) params.set('tagLogic', tagLogic)
    if (hashFilter !== 'ALL') params.set('hash', hashFilter)
    if (fieldBucket !== 'ALL') params.set('fieldBucket', fieldBucket)

    const loadTendencies = async () => {
      setLoadingTendencies(true)
      setTendencyError(null)
      try {
        const resp = await fetch(`/api/scout/tendencies?${params.toString()}`)
        const json = await resp.json()
        if (!resp.ok) throw new Error(json.error || 'Failed to load tendencies')
        setTendencies(json.tendencies || [])
        track('scouting_tendencies_loaded', { rows: (json.tendencies || []).length })
      } catch (err) {
        setTendencyError(err instanceof Error ? err.message : 'Failed to load tendencies')
        setTendencies([])
        track('scouting_tendencies_failed', { error: err instanceof Error ? err.message : 'Unknown' })
      } finally {
        setLoadingTendencies(false)
      }
    }

    const loadRecent = async () => {
      setLoadingRecent(true)
      setRecentError(null)
      try {
        const recentParams = new URLSearchParams(params.toString())
        recentParams.set('limit', '25')
        recentParams.set('offset', '0')
        const resp = await fetch(`/api/scout/recent?${recentParams.toString()}`)
        const json = await resp.json()
        if (!resp.ok) throw new Error(json.error || 'Failed to load plays')
        setRecent(json.plays || [])
        setRecentOffset(json.plays?.length || 0)
        setRecentEnd((json.plays || []).length < 25)
        track('scouting_recent_loaded', { rows: (json.plays || []).length })
      } catch (err) {
        setRecentError(err instanceof Error ? err.message : 'Failed to load plays')
        setRecent([])
        track('scouting_recent_failed', { error: err instanceof Error ? err.message : 'Unknown' })
      } finally {
        setLoadingRecent(false)
      }
    }

    loadTendencies()
    loadRecent()
  }, [opponent, season, phase, teamId, tagFilter, tagLogic, hashFilter, fieldBucket, track])

  const loadMoreRecent = async () => {
    if (recentEnd || !opponent || !season) return
    setLoadingRecent(true)
    try {
      const resp = await fetch(
        `/api/scout/recent?teamId=${encodeURIComponent(teamId)}&opponent=${encodeURIComponent(opponent)}&season=${encodeURIComponent(season)}&limit=25&offset=${recentOffset}`
      )
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error || 'Failed to load more plays')
      const newPlays: RecentPlay[] = json.plays || []
      setRecent((prev) => [...prev, ...newPlays])
      setRecentOffset(recentOffset + newPlays.length)
      if (newPlays.length < 25) setRecentEnd(true)
      track('scouting_recent_loaded_more', { rows: newPlays.length })
    } catch (err) {
      setRecentError(err instanceof Error ? err.message : 'Failed to load more plays')
      track('scouting_recent_more_failed', { error: err instanceof Error ? err.message : 'Unknown' })
    } finally {
      setLoadingRecent(false)
    }
  }
  const onUpload = async (formData: FormData) => {
    setUploading(true)
    setUploadError(null)
    setUploadInfo(null)
    setPreviewRows([])
    track('scouting_upload_started')
    try {
      const resp = await fetch('/api/scout/imports/upload', { method: 'POST', body: formData })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error || 'Upload failed')
      setUploadInfo({ importId: json.importId, rows: json.totalRows, rowsWithErrors: json.rowsWithErrors })
      setErrorCsvUrl(json.rowsWithErrors > 0 ? `/api/scout/imports/${json.importId}/errors` : null)
      track('scouting_upload_succeeded', {
        importId: json.importId,
        rows: json.totalRows,
        rowsWithErrors: json.rowsWithErrors,
      })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
      track('scouting_upload_failed', { error: err instanceof Error ? err.message : 'Unknown' })
    } finally {
      setUploading(false)
    }
  }

  const onPreview = async () => {
    if (!uploadInfo?.importId) return
    setUploadError(null)
    setPreviewing(true)
    try {
      const resp = await fetch(`/api/scout/imports/${uploadInfo.importId}/preview?limit=100`)
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error || 'Preview failed')
      type PreviewApiRow = { raw_row: Record<string, unknown>; errors: string[] }
      const parsed: PreviewRow[] =
        (json.rows as PreviewApiRow[] | undefined)?.map((r) => ({
          raw_row: r.raw_row,
          errors: r.errors ?? [],
        })) ?? []
      setPreviewRows(parsed)
      track('scouting_preview_succeeded', { importId: uploadInfo.importId, rows: parsed.length })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Preview failed')
      track('scouting_preview_failed', { importId: uploadInfo.importId, error: err instanceof Error ? err.message : 'Unknown' })
    } finally {
      setPreviewing(false)
    }
  }

  const onCommit = async () => {
    if (!uploadInfo?.importId) return
    setCommitting(true)
    setUploadError(null)
    track('scouting_commit_started', { importId: uploadInfo.importId })
    try {
      const resp = await fetch('/api/scout/imports/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importId: uploadInfo.importId }),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error || 'Commit failed')
      setUploadInfo(null)
      setPreviewRows([])
      track('scouting_commit_succeeded', { importId: uploadInfo.importId })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Commit failed')
      track('scouting_commit_failed', { importId: uploadInfo.importId, error: err instanceof Error ? err.message : 'Unknown' })
    } finally {
      setCommitting(false)
    }
  }

  useEffect(() => {
    const loadViews = async () => {
      try {
        const resp = await fetch(`/api/scout/views?teamId=${encodeURIComponent(teamId)}`)
        const json = await resp.json()
        if (!resp.ok) throw new Error(json.error || 'Failed to load views')
        setSavedViews(json.views || [])
      } catch {
        setSavedViews([])
      }
    }
    loadViews()
  }, [teamId])

  const handleSaveView = async () => {
    if (!viewName.trim()) return
    setViewError(null)
    const filters = {
      phase,
      tagFilter,
      tagLogic,
      hashFilter,
      fieldBucket,
    }
    setSavingView(true)
    try {
      const resp = await fetch('/api/scout/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          name: viewName.trim(),
          opponent: opponent || null,
          season: season || null,
          filters,
        }),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error || 'Failed to save view')
      setViewName('')
      const refresh = await fetch(`/api/scout/views?teamId=${encodeURIComponent(teamId)}`)
      const refreshJson = await refresh.json()
      setSavedViews(refreshJson.views || [])
      track('scouting_view_saved', { viewId: json.id || 'unknown' })
    } catch (err) {
      setViewError(err instanceof Error ? err.message : 'Failed to save view')
      track('scouting_view_save_failed', { error: err instanceof Error ? err.message : 'Unknown' })
    } finally {
      setSavingView(false)
    }
  }

  const applyView = (view: SavedView) => {
    setSelectedViewId(view.id)
    if (view.opponent_name) setOpponent(view.opponent_name)
    if (view.season) setSeason(view.season)
    const f = (view.filters || {}) as Record<string, unknown>
    if (typeof f.phase === 'string') setPhase(f.phase as 'OFFENSE' | 'DEFENSE' | 'ALL')
    if (typeof f.tagFilter === 'string') setTagFilter(f.tagFilter)
    if (f.tagLogic === 'AND' || f.tagLogic === 'OR') setTagLogic(f.tagLogic)
    if (typeof f.hashFilter === 'string') setHashFilter(f.hashFilter)
    if (typeof f.fieldBucket === 'string') setFieldBucket(f.fieldBucket)
    track('scouting_view_applied', { viewId: view.id })
  }

  const handleDeleteView = async (id: string) => {
    try {
      const resp = await fetch(`/api/scout/views/${id}`, { method: 'DELETE' })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error || 'Failed to delete view')
      setSavedViews((prev) => prev.filter((v) => v.id !== id))
      if (selectedViewId === id) setSelectedViewId(null)
      track('scouting_view_deleted', { viewId: id })
    } catch (err) {
      setViewError(err instanceof Error ? err.message : 'Failed to delete view')
      track('scouting_view_delete_failed', { viewId: id, error: err instanceof Error ? err.message : 'Unknown' })
    }
  }

  const tendencySkeletonRows = Array.from({ length: 5 })
  const recentSkeletonRows = Array.from({ length: 4 })
  const errorMessages = [tendencyError, recentError, uploadError, viewError].filter(Boolean) as string[]
  const filtersDisabled = !opponent || !season
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">Import</p>
              <h3 className="text-lg font-semibold text-slate-50">Scouting CSV</h3>
            </div>
            <a
              href="/api/scout/imports/template"
              className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-100 transition hover:bg-slate-700"
              onClick={() => track('scouting_template_download')}
            >
              Download template
            </a>
          </div>
          <UploadForm
            teamId={teamId}
            defaultOpponent={opponent}
            defaultSeason={season}
            onUpload={onUpload}
            uploading={uploading}
          />
          {uploadInfo && (
            <div className="space-y-1 text-xs text-slate-200">
              <div>Import ID: {uploadInfo.importId}</div>
              <div>
                Staged rows: {uploadInfo.rows} (with errors: {uploadInfo.rowsWithErrors})
              </div>
              {errorCsvUrl && (
                <a className="inline-flex text-amber-200 underline underline-offset-2" href={errorCsvUrl}>
                  Download errors CSV
                </a>
              )}
              <div className="flex gap-2">
                <button
                  onClick={onPreview}
                  disabled={previewing}
                  className="rounded bg-slate-800 px-3 py-1 text-xs text-slate-100 hover:bg-slate-700 disabled:opacity-60"
                >
                  {previewing ? 'Previewing...' : 'Preview staged'}
                </button>
                <button
                  onClick={onCommit}
                  disabled={committing}
                  className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-emerald-500 disabled:opacity-50"
                >
                  {committing ? 'Committing...' : 'Commit'}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 lg:col-span-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">Opponent</p>
              <h3 className="text-lg font-semibold text-slate-50">Tendencies & calls</h3>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">Opponent</span>
                <select
                  value={`${opponent || ''}|||${season || ''}`}
                  onChange={(e) => {
                    const [nextOpponent = '', nextSeason = ''] = e.target.value.split('|||')
                    setOpponent(nextOpponent)
                    setSeason(nextSeason)
                    track('scouting_filter_change', { field: 'opponent', value: nextOpponent, season: nextSeason })
                  }}
                  className="min-w-[170px] rounded border border-slate-700 bg-slate-800 px-3 py-1 text-slate-100"
                >
                  <option value="|||">Choose opponent</option>
                  {opponents
                    .filter((o) => o.opponent || o.season)
                    .map((o, idx) => {
                      const value = `${o.opponent || ''}|||${o.season || ''}`
                      const label = o.opponent ? (o.season ? `${o.opponent} | ${o.season}` : o.opponent) : 'Choose opponent'
                      return (
                        <option key={`${o.opponent || 'opponent'}-${o.season || 'season'}-${idx}`} value={value}>
                          {label}
                        </option>
                      )
                    })}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">Season</span>
                <input
                  value={season || ''}
                  onChange={(e) => {
                    setSeason(e.target.value)
                    track('scouting_filter_change', { field: 'season', value: e.target.value })
                  }}
                  placeholder="Season"
                  className="w-32 rounded border border-slate-700 bg-slate-800 px-3 py-1 text-slate-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">Phase</span>
                <select
                  value={phase}
                  onChange={(e) => {
                    const value = e.target.value as 'OFFENSE' | 'DEFENSE' | 'ALL'
                    setPhase(value)
                    track('scouting_filter_change', { field: 'phase', value })
                  }}
                  className="min-w-[130px] rounded border border-slate-700 bg-slate-800 px-3 py-1 text-slate-100"
                  disabled={filtersDisabled}
                >
                  <option value="ALL">All phases</option>
                  <option value="OFFENSE">Offense</option>
                  <option value="DEFENSE">Defense</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">Tag filter</span>
                <input
                  value={tagFilter}
                  onChange={(e) => {
                    setTagFilter(e.target.value)
                    track('scouting_filter_change', { field: 'tags', value: e.target.value })
                  }}
                  placeholder="Filter tags"
                  className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-slate-100"
                  disabled={filtersDisabled}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">Tag logic</span>
                <select
                  value={tagLogic}
                  onChange={(e) => {
                    const value = e.target.value as 'AND' | 'OR'
                    setTagLogic(value)
                    track('scouting_filter_change', { field: 'tagLogic', value })
                  }}
                  className="min-w-[110px] rounded border border-slate-700 bg-slate-800 px-3 py-1 text-slate-100"
                  disabled={filtersDisabled}
                >
                  <option value="OR">Tags: OR</option>
                  <option value="AND">Tags: AND</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">Hash</span>
                <select
                  value={hashFilter}
                  onChange={(e) => {
                    setHashFilter(e.target.value)
                    track('scouting_filter_change', { field: 'hash', value: e.target.value })
                  }}
                  className="min-w-[110px] rounded border border-slate-700 bg-slate-800 px-3 py-1 text-slate-100"
                  disabled={filtersDisabled}
                >
                  <option value="ALL">Hash: All</option>
                  <option value="L">Left</option>
                  <option value="M">Middle</option>
                  <option value="R">Right</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">Field spot</span>
                <select
                  value={fieldBucket}
                  onChange={(e) => {
                    setFieldBucket(e.target.value)
                    track('scouting_filter_change', { field: 'fieldBucket', value: e.target.value })
                  }}
                  className="min-w-[130px] rounded border border-slate-700 bg-slate-800 px-3 py-1 text-slate-100"
                  disabled={filtersDisabled}
                >
                  <option value="ALL">Field position</option>
                  <option value="RZ">Red zone (20+)</option>
                  <option value="MIDFIELD">Midfield</option>
                  <option value="BACKED_UP">Backed up</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-1">
                <input
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="Save view name"
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleSaveView}
                  disabled={savingView}
                  className="rounded bg-slate-800 px-3 py-1 text-xs text-slate-100 hover:bg-slate-700 disabled:opacity-60"
                >
                  {savingView ? 'Saving...' : 'Save view'}
                </button>
                {savedViews.length > 0 && (
                  <select
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                    value={selectedViewId || ''}
                    onChange={(e) => {
                      const v = savedViews.find((sv) => sv.id === e.target.value)
                      if (v) applyView(v)
                    }}
                  >
                    <option value="">Load view...</option>
                    {savedViews.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                )}
                {selectedViewId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteView(selectedViewId)}
                    className="rounded bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-500"
                  >
                    Delete view
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600"
                >
                  Clear filters
                </button>
              </div>
              {filtersDisabled && (
                <span className="text-[0.65rem] text-slate-500">Select opponent and season to enable filters.</span>
              )}
              {tendencyExportUrl && (
                <a
                  href={tendencyExportUrl}
                  onClick={() => track('scouting_export', { kind: 'tendencies' })}
                  className="rounded bg-slate-800 px-3 py-1 text-xs text-slate-100 hover:bg-slate-700"
                >
                  Export tendencies
                </a>
              )}
              {recentExportUrl && (
                <a
                  href={recentExportUrl}
                  onClick={() => track('scouting_export', { kind: 'recent' })}
                  className="rounded bg-slate-800 px-3 py-1 text-xs text-slate-100 hover:bg-slate-700"
                >
                  Export plays
                </a>
              )}
            </div>
          </div>
          {errorMessages.length > 0 && (
            <div className="space-y-1 text-xs text-red-300">
              {errorMessages.map((msg, idx) => (
                <div key={`${msg}-${idx}`}>{msg}</div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-100">Tendency reads</h4>
                {loadingTendencies && <span className="text-[0.7rem] text-slate-500">Loading...</span>}
              </div>
              {loadingTendencies ? (
                <div className="space-y-2">
                  {tendencySkeletonRows.map((_, idx) => (
                    <div key={idx} className="h-8 rounded bg-slate-800/60 animate-pulse" />
                  ))}
                </div>
              ) : tendencies.length === 0 ? (
                <p className="text-xs text-slate-500">No tendencies yet. Upload scouting files for this opponent.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-slate-100">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="px-2 py-1 text-left">Down</th>
                        <th className="px-2 py-1 text-left">Dist</th>
                        <th className="px-2 py-1 text-left">Formation</th>
                        <th className="px-2 py-1 text-left">Personnel</th>
                        <th className="px-2 py-1 text-left">Family</th>
                        <th className="px-2 py-1 text-right">Samples</th>
                        <th className="px-2 py-1 text-right">Expl%</th>
                        <th className="px-2 py-1 text-right">TO%</th>
                        <th className="px-2 py-1 text-right">Avg Gain</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tendencies.map((t, idx) => (
                        <tr key={`${t.formation}-${t.personnel}-${t.play_family}-${idx}`} className="border-t border-slate-800/70">
                          <td className="px-2 py-1">{t.down_bucket || '--'}</td>
                          <td className="px-2 py-1">{t.distance_bucket || '--'}</td>
                          <td className="px-2 py-1">{t.formation || '--'}</td>
                          <td className="px-2 py-1">{t.personnel || '--'}</td>
                          <td className="px-2 py-1">{t.play_family || '--'}</td>
                          <td className="px-2 py-1 text-right">{t.samples}</td>
                          <td className="px-2 py-1 text-right">{(Number(t.explosive_rate || 0) * 100).toFixed(0)}%</td>
                          <td className="px-2 py-1 text-right">{(Number(t.turnover_rate || 0) * 100).toFixed(0)}%</td>
                          <td className="px-2 py-1 text-right">{Number(t.avg_gain || 0).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-100">Recent calls</h4>
                {loadingRecent && <span className="text-[0.7rem] text-slate-500">Loading...</span>}
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {loadingRecent ? (
                  <div className="space-y-2">
                    {recentSkeletonRows.map((_, idx) => (
                      <div key={idx} className="h-16 rounded border border-slate-800 bg-slate-900/60 animate-pulse" />
                    ))}
                  </div>
                ) : recent.length === 0 ? (
                  <p className="text-xs text-slate-500">No recent calls yet. Upload scouting data for this opponent.</p>
                ) : (
                  recent.map((p) => (
                    <div key={p.id} className="rounded border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          {p.phase} | {p.down ?? '-'}&amp;{p.distance ?? '-'} | {p.hash || '--'}
                        </span>
                        <span className="text-[0.65rem] text-slate-500">{p.formation || '--'}</span>
                      </div>
                      <div className="text-slate-300">{p.play_family || p.result || '--'}</div>
                      <div className="text-slate-500">
                        Gain: {p.gained_yards ?? '--'} | Explosive: {p.explosive ? 'Yes' : 'No'} | TO: {p.turnover ? 'Yes' : 'No'}
                      </div>
                      {p.tags?.length ? <div className="text-slate-500">Tags: {p.tags.join(', ')}</div> : null}
                    </div>
                  ))
                )}
              </div>
              {!recentEnd && recent.length > 0 && (
                <button
                  onClick={loadMoreRecent}
                  disabled={loadingRecent}
                  className="w-full rounded bg-slate-800 px-3 py-2 text-center text-xs text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                >
                  {loadingRecent ? 'Loading...' : 'Load more'}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-100">Recent imports</h3>
        {imports.length === 0 ? (
          <p className="text-xs text-slate-500">No uploads yet. Import scouting CSVs to fill the board.</p>
        ) : (
          <div className="overflow-x-auto text-xs text-slate-100">
            <table className="min-w-full">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-2 py-1 text-left">Opponent</th>
                  <th className="px-2 py-1 text-left">Season</th>
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-2 py-1 text-left">File</th>
                  <th className="px-2 py-1 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((imp) => (
                  <tr key={imp.id} className="border-t border-slate-800/70">
                    <td className="px-2 py-1">{imp.opponent_name}</td>
                    <td className="px-2 py-1">{imp.season || '--'}</td>
                    <td className="px-2 py-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.65rem] ${
                          imp.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-100'
                            : imp.status === 'failed'
                            ? 'bg-rose-500/20 text-rose-100'
                            : 'bg-amber-500/20 text-amber-100'
                        }`}
                      >
                        {imp.status}
                      </span>
                    </td>
                    <td className="px-2 py-1">{imp.original_filename || '--'}</td>
                    <td className="px-2 py-1 text-slate-400">{new Date(imp.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {previewRows.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">Staged preview (first 100)</h3>
            <span className="text-[0.7rem] text-slate-500">Errors highlighted per row</span>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {previewRows.map((row, idx) => (
              <div key={idx} className="rounded border border-slate-800 bg-slate-950/70 p-2 text-xs text-slate-100">
                <div className="wrap-break-word text-slate-300">{JSON.stringify(row.raw_row)}</div>
                {row.errors.length > 0 ? (
                  <div className="text-amber-300">Errors: {row.errors.join('; ')}</div>
                ) : (
                  <div className="text-emerald-300">No errors</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

type UploadFormProps = {
  teamId: string
  defaultOpponent?: string | null
  defaultSeason?: string | null
  onUpload: (formData: FormData) => Promise<void>
  uploading: boolean
}

function UploadForm({ teamId, defaultOpponent, defaultSeason, onUpload, uploading }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [opponent, setOpponent] = useState(defaultOpponent || '')
  const [season, setSeason] = useState(defaultSeason || '')
  const [phase, setPhase] = useState<'OFFENSE' | 'DEFENSE'>('OFFENSE')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    form.append('teamId', teamId)
    form.append('opponent', opponent)
    form.append('season', season)
    form.append('phase', phase)
    await onUpload(form)
  }

  return (
    <form className="space-y-2 text-sm" onSubmit={submit}>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="text-xs text-slate-300"
      />
      <div className="flex gap-2">
        <input
          value={opponent}
          onChange={(e) => setOpponent(e.target.value)}
          placeholder="Opponent"
          className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-1 text-slate-100"
        />
        <input
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          placeholder="Season"
          className="w-28 rounded border border-slate-700 bg-slate-800 px-3 py-1 text-slate-100"
        />
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value as 'OFFENSE' | 'DEFENSE')}
          className="w-32 rounded border border-slate-700 bg-slate-800 px-3 py-1 text-slate-100"
        >
          <option value="OFFENSE">Offense</option>
          <option value="DEFENSE">Defense</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={uploading || !file || !opponent}
        className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-emerald-500 disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload & stage'}
      </button>
    </form>
  )
}
