import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

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
  return supabase
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const importId = params.id
    if (!importId) return NextResponse.json({ error: 'importId is required' }, { status: 400 })

    const { data: imp, error: impErr } = await supabase
      .from('scout_imports')
      .select('team_id, opponent_name, season')
      .eq('id', importId)
      .maybeSingle()
    if (impErr || !imp) return NextResponse.json({ error: 'Import not found' }, { status: 404 })

    await assertMembership(imp.team_id as string, user.id)

    const { data: rows, error: rowsErr } = await supabase
      .from('scout_import_rows')
      .select('raw_row, errors')
      .eq('import_id', importId)
      .neq('errors', '{}')

    if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 400 })

    const headers = ['row_number', 'errors', 'raw']
    const csvLines = [
      headers.join(','),
      ...(rows ?? []).map((r) => {
        const raw = r.raw_row as Record<string, unknown> | null
        const rowNum = (raw?.row_number as number | string | undefined) ?? ''
        const errs = Array.isArray(r.errors) ? r.errors.join('|') : ''
        const rawStr = JSON.stringify(raw || {})
        return [rowNum, errs, rawStr].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
      }),
    ].join('\n')

    return new NextResponse(csvLines, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="import_errors_${imp.opponent_name}_${imp.season || 'season'}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
