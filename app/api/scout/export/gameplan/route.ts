import { NextResponse, type NextRequest } from 'next/server'
import PDFDocument from 'pdfkit'
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const opponent = searchParams.get('opponent')
    const season = searchParams.get('season')
    const phase = (searchParams.get('phase') || undefined) as 'OFFENSE' | 'DEFENSE' | undefined

    if (!teamId || !opponent || !season) {
      return NextResponse.json({ error: 'teamId, opponent, and season are required' }, { status: 400 })
    }

    await assertMembership(teamId, user.id)

    const tagsParam = searchParams.get('tags')
    const tagLogic = (searchParams.get('tagLogic') || 'OR').toUpperCase() as 'AND' | 'OR'
    const hashFilter = searchParams.get('hash') || null
    const fieldBucket = searchParams.get('fieldBucket') || null
    const tags =
      tagsParam && tagsParam.length
        ? tagsParam
            .split(',')
            .map((t: string) => t.toLowerCase().trim())
            .filter(Boolean)
        : null

    const [tendRes, recentRes] = await Promise.all([
      supabase.rpc('get_scout_tendencies', {
        p_team: teamId,
        p_opponent: opponent,
        p_season: season,
        p_phase: phase ?? null,
        p_tags: tags,
        p_tag_logic: tagLogic,
        p_hash: hashFilter,
        p_field_bucket: fieldBucket,
      }),
      supabase.rpc('get_scout_recent', {
        p_team: teamId,
        p_opponent: opponent,
        p_season: season,
        p_limit: 100,
        p_offset: 0,
        p_tags: tags,
        p_tag_logic: tagLogic,
        p_hash: hashFilter,
        p_field_bucket: fieldBucket,
      }),
    ])

    if (tendRes.error) return NextResponse.json({ error: tendRes.error.message }, { status: 400 })
    if (recentRes.error) return NextResponse.json({ error: recentRes.error.message }, { status: 400 })

    const pdf = new PDFDocument({ margin: 36 })
    const chunks: Buffer[] = []
    pdf.on('data', (c: Buffer) => chunks.push(c))

    pdf.fontSize(16).text(`Gameplan: ${opponent} (${season})`, { underline: true })
    pdf.moveDown(0.5)
    const filterSummary = [
      `Phase: ${phase ?? 'ALL'}`,
      tags ? `Tags: ${tags.join(',')}` : null,
      hashFilter ? `Hash: ${hashFilter}` : null,
      fieldBucket ? `Field: ${fieldBucket}` : null,
    ]
      .filter(Boolean)
      .join(' | ')
    pdf.fontSize(10).text(`${filterSummary} | Generated: ${new Date().toLocaleString()}`)
    pdf.moveDown()

    // Tendencies
    pdf.fontSize(12).text('Tendencies', { bold: true })
    pdf.moveDown(0.25)
    const tendencies =
      (tendRes.data as {
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
      }[] | null) ?? []
    if (tendencies.length === 0) {
      pdf.text('No data yet.')
    } else {
      tendencies.slice(0, 40).forEach((t) => {
        pdf
          .fontSize(9)
          .text(
            `${t.down_bucket}/${t.distance_bucket} | ${t.formation || '—'} | ${t.personnel || '—'} | ${t.play_family || '—'} | hash ${t.hash || '—'} | samples ${t.samples} | expl ${(Number(
              t.explosive_rate || 0
            ) * 100).toFixed(0)}% | TO ${(Number(t.turnover_rate || 0) * 100).toFixed(0)}% | gain ${Number(
              t.avg_gain || 0
            ).toFixed(1)}`
          )
      })
    }

    pdf.moveDown()
    pdf.fontSize(12).text('Recent Plays', { bold: true })
    pdf.moveDown(0.25)
    const plays =
      (recentRes.data as {
        created_at: string | null
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
        explosive: boolean | null
        turnover: boolean | null
        tags: string[] | null
      }[] | null) ?? []
    if (plays.length === 0) {
      pdf.fontSize(9).text('No recent plays.')
    } else {
      plays.slice(0, 60).forEach((p) => {
        pdf
          .fontSize(9)
          .text(
            `${p.phase} | ${p.down ?? '-'}&${p.distance ?? '-'} hash ${p.hash || '—'} | ${p.formation || '—'} | ${p.personnel || '—'} | ${p.play_family || p.result || '—'} | gain ${p.gained_yards ?? '—'} | expl ${p.explosive ? 'Y' : 'N'} | TO ${p.turnover ? 'Y' : 'N'} | tags ${Array.isArray(p.tags) ? p.tags.join(', ') : ''}`
          )
      })
    }

    pdf.end()
    const buffer = Buffer.concat(chunks)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="gameplan_${opponent}_${season}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
