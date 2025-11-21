import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from '@/utils/supabase/server'
import { hashBuffer, normalizeRow, parseCsvRows } from '@/utils/scout/ingest'

async function assertMembership(teamId: string, userId: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) {
    throw new Error('You do not have access to this team')
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file')
    const teamId = (form.get('teamId') as string | null)?.trim()
    const opponentName =
      (form.get('opponent') as string | null)?.trim() || (form.get('opponent_name') as string | null)?.trim()
    const season = (form.get('season') as string | null)?.trim() || ''
    const defaultPhase = ((form.get('phase') as string | null)?.toUpperCase() || 'OFFENSE') as 'OFFENSE' | 'DEFENSE'

    if (!teamId) return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    if (!opponentName) return NextResponse.json({ error: 'opponent is required' }, { status: 400 })
    if (!file || !(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 })

    await assertMembership(teamId, user.id)

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileHash = hashBuffer(buffer)

    const svc = createSupabaseServiceRoleClient()

    const { data: existing } = await svc
      .from('scout_imports')
      .select('id,status')
      .eq('team_id', teamId)
      .eq('opponent_name', opponentName)
      .eq('season', season)
      .eq('file_hash', fileHash)
      .maybeSingle()

    const rows = parseCsvRows(buffer)

    let importId = existing?.id
    if (!importId) {
      const { data: inserted, error: insertError } = await svc
        .from('scout_imports')
        .insert({
          team_id: teamId,
          opponent_name: opponentName,
          season,
          source: 'csv',
          status: 'pending',
          original_filename: file.name,
          file_hash: fileHash,
          created_by: user.id,
        })
        .select('id')
        .maybeSingle()
      if (insertError || !inserted) {
        return NextResponse.json({ error: insertError?.message || 'Failed to create import' }, { status: 400 })
      }
      importId = inserted.id as string
    }

    // Clear any previous staging rows for this import to keep idempotent behavior
    await svc.from('scout_import_rows').delete().eq('import_id', importId)

    const staged = rows.map((row, idx) => {
      const { normalized, errors } = normalizeRow(row, {
        teamId,
        opponent: opponentName,
        season,
        defaultPhase,
      })
      return {
        team_id: teamId,
        import_id: importId,
        opponent_name: opponentName,
        season,
        phase: normalized.phase,
        down: normalized.down,
        distance: normalized.distance,
        hash: normalized.hash,
        field_position: normalized.field_position,
        quarter: normalized.quarter,
        time_remaining_seconds: normalized.time_remaining_seconds,
        formation: normalized.formation,
        personnel: normalized.personnel,
        front: normalized.front,
        coverage: normalized.coverage,
        pressure: normalized.pressure,
        play_family: normalized.play_family,
        result: normalized.result,
        gained_yards: normalized.gained_yards,
        explosive: normalized.explosive,
        turnover: normalized.turnover,
        tags: normalized.tags,
        raw_row: { row_number: idx + 1, ...row },
        errors,
      }
    })

    // Chunk inserts to avoid payload limits
    const chunkSize = 500
    let errorRows = 0
    for (let i = 0; i < staged.length; i += chunkSize) {
      const chunk = staged.slice(i, i + chunkSize)
      const { error: insertChunkError } = await svc.from('scout_import_rows').insert(chunk, { returning: 'minimal' })
      if (insertChunkError) {
        return NextResponse.json({ error: insertChunkError.message }, { status: 400 })
      }
    }
    errorRows = staged.filter((r) => r.errors.length > 0).length

    await svc
      .from('scout_imports')
      .update({
        status: 'pending',
        error_log: { staged_rows: staged.length, rows_with_errors: errorRows },
      })
      .eq('id', importId)

    const resp = NextResponse.json({
      importId,
      totalRows: staged.length,
      rowsWithErrors: errorRows,
    })
    resp.headers.set('Cache-Control', 'no-store')
    return resp
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
