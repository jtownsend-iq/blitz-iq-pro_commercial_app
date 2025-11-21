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

    const { searchParams } = new URL(request.url)
    const limit = Math.max(0, Math.min(200, Number(searchParams.get('limit')) || 50))
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0)

    const { data: imp, error: impErr } = await supabase
      .from('scout_imports')
      .select('team_id')
      .eq('id', importId)
      .maybeSingle()
    if (impErr || !imp) return NextResponse.json({ error: 'Import not found' }, { status: 404 })

    await assertMembership(imp.team_id as string, user.id)

    const { data: rows, error: rowsErr } = await supabase
      .from('scout_import_rows')
      .select('*')
      .eq('import_id', importId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 400 })

    return NextResponse.json({ rows: rows ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
