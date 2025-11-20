import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServiceRoleClient } from '@/utils/supabase/server'
import { generateDriveSummary } from '@/utils/ai/generateDriveSummary'

const refreshSchema = z.object({
  teamId: z.string().uuid(),
  gameId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = refreshSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }

    const supabase = createSupabaseServiceRoleClient()
    const { teamId, gameId } = parsed.data

    const { data: sessions, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id, game_id, unit')
      .eq('team_id', teamId)
      .filter('game_id', gameId ? 'eq' : 'not.eq', gameId ?? 'null')

    if (sessionError) {
      console.error('Snapshot refresh sessions error:', sessionError.message)
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ success: true, updated: 0 })
    }

    let totalUpdated = 0

    for (const session of sessions) {
      const { data: drives, error: driveError } = await supabase
        .from('chart_events')
        .select('drive_number')
        .eq('game_session_id', session.id)
        .not('drive_number', 'is', null)
        .order('drive_number', { ascending: true })
        .limit(1000)

      if (driveError) {
        console.error('Snapshot refresh drives error:', driveError.message)
        continue
      }

      const uniqueDrives = Array.from(
        new Set((drives ?? []).map((drive) => drive.drive_number).filter(Boolean))
      )

      for (const driveNumber of uniqueDrives) {
        const { data: driveEvents, error: eventError } = await supabase
          .from('chart_events')
          .select('gained_yards, explosive, turnover')
          .eq('game_session_id', session.id)
          .eq('drive_number', driveNumber)
          .order('sequence', { ascending: true })

        if (eventError || !driveEvents) {
          console.error('Snapshot refresh drive events error:', eventError?.message)
          continue
        }

        const plays = driveEvents.length
        const totalYards = driveEvents.reduce((sum, event) => sum + (event.gained_yards ?? 0), 0)
        const explosivePlays = driveEvents.filter((event) => Boolean(event.explosive)).length
        const turnovers = driveEvents.filter((event) => Boolean(event.turnover)).length

        const aiSummary =
          plays === 0
            ? 'Not enough plays to evaluate yet.'
            : await generateDriveSummary({
                unit: session.unit ?? 'OFFENSE',
                plays,
                totalYards,
                explosivePlays,
                turnovers,
              })

        const metrics = {
          plays,
          totalYards,
          explosivePlays,
          turnovers,
          ai_summary: aiSummary,
        }

        await supabase.from('chart_snapshots').upsert(
          {
            team_id: teamId,
            game_id: session.game_id,
            game_session_id: session.id,
            drive_number: driveNumber,
            situation: { drive: driveNumber, unit: session.unit },
            metrics,
            generated_at: new Date().toISOString(),
          },
          {
            onConflict: 'team_id,game_session_id,drive_number',
          }
        )

        totalUpdated++
      }
    }

    return NextResponse.json({ success: true, updated: totalUpdated })
  } catch (error) {
    console.error('Snapshot refresh error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
