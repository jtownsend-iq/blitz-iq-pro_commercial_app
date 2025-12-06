import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { createSupabaseServiceRoleClient } from '@/utils/supabase/server'
import { env } from '@/utils/env'
import { createTenantRateLimiter } from '@/utils/rateLimit'

const provisionSchema = z.object({
  teamName: z.string().min(2).max(200),
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().optional(),
  role: z.enum(['OWNER', 'ADMIN', 'COACH', 'VIEWER']).optional(),
  idempotencyKey: z.string().max(120).optional(),
  setActiveTeam: z.boolean().default(true),
})

const TAG_DEFAULTS = [
  { label: 'Trips', category: 'FORMATION' },
  { label: 'Bunch', category: 'FORMATION' },
  { label: 'Empty', category: 'FORMATION' },
  { label: '11 personnel', category: 'PERSONNEL' },
  { label: '12 personnel', category: 'PERSONNEL' },
  { label: 'Cover 3', category: 'COVERAGE' },
  { label: 'Cover 4', category: 'COVERAGE' },
  { label: 'Over', category: 'FRONT' },
  { label: 'Under', category: 'FRONT' },
  { label: 'Fire Zone', category: 'PRESSURE' },
  { label: '3rd & Medium', category: 'SITUATION' },
]

export async function POST(request: Request) {
  const token = env.provisionToken
  if (!token) {
    return NextResponse.json({ error: 'Provision token not configured' }, { status: 500 })
  }
  const authHeader = (await headers()).get('authorization') || ''
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : ''
  if (bearer !== token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = provisionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { teamName, userId: rawUserId, userEmail, role, setActiveTeam, idempotencyKey } = parsed.data
  const supabase = createSupabaseServiceRoleClient()

  const limiter = createTenantRateLimiter(10, 60_000)
  const tokenHash = Buffer.from(bearer).toString('base64url')
  await limiter.guard(`provision:${tokenHash}`)

  // Idempotency: check if we already provisioned with this key
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from('audit_logs')
      .select('id, action, metadata')
      .eq('action', 'provision_team')
      .eq('metadata->>idempotencyKey', idempotencyKey)
      .maybeSingle()
    if (existing?.metadata?.teamId) {
      return NextResponse.json({ ok: true, teamId: existing.metadata.teamId, userId: existing.metadata.userId, idempotent: true })
    }
  }

  // Resolve userId from email if needed
  let userId = rawUserId
  if (!userId && userEmail) {
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .maybeSingle()
    if (profileErr || !profile?.id) {
      return NextResponse.json({ error: 'User not found for provided email' }, { status: 404 })
    }
    userId = profile.id as string
  }

  if (!userId) {
    return NextResponse.json({ error: 'userId or userEmail is required' }, { status: 400 })
  }

  const teamId = randomUUID()

  // Create team
  const { error: teamErr } = await supabase.from('teams').insert({
    id: teamId,
    name: teamName,
  })
  if (teamErr) {
    return NextResponse.json({ error: `Failed to create team: ${teamErr.message}` }, { status: 400 })
  }

  // Add membership
  const { error: memberErr } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      user_id: userId,
      role: role ?? 'VIEWER',
    })
  if (memberErr) {
    return NextResponse.json({ error: `Failed to add membership: ${memberErr.message}` }, { status: 400 })
  }

  // Seed defaults
  const tagPayload = TAG_DEFAULTS.map((tag, idx) => ({
    team_id: teamId,
    label: tag.label,
    category: tag.category,
    unit: tag.category === 'PERSONNEL' || tag.category === 'FORMATION' ? 'OFFENSE' : null,
    sort_order: idx,
    context: 'PROVISION',
  }))
  const { error: tagErr } = await supabase.from('chart_tags').insert(tagPayload)
  if (tagErr) {
    return NextResponse.json({ error: `Failed to seed tags: ${tagErr.message}` }, { status: 400 })
  }

  const thresholds = {
    team_id: teamId,
    explosive_run_threshold: 12,
    explosive_pass_threshold: 18,
    success_1st_yards: 4,
    success_2nd_pct: 70,
    success_3rd_pct: 60,
    success_4th_pct: 60,
  }
  const { error: thresholdsErr } = await supabase.from('charting_defaults').insert([thresholds])
  if (thresholdsErr) {
    return NextResponse.json({ error: `Failed to seed thresholds: ${thresholdsErr.message}` }, { status: 400 })
  }

  const { error: quickstartErr } = await supabase
    .from('quickstart_progress')
    .insert({
      team_id: teamId,
      seeded_position_groups: true,
      seeded_tags: true,
      seeded_schedule: false,
    })
  if (quickstartErr) {
    return NextResponse.json({ error: `Failed to seed quickstart: ${quickstartErr.message}` }, { status: 400 })
  }

  if (setActiveTeam) {
    await supabase.from('users').update({ active_team_id: teamId }).eq('id', userId)
  }

  await supabase.from('audit_logs').insert({
    team_id: teamId,
    action: 'provision_team',
    actor_user_id: userId,
    metadata: { idempotencyKey: idempotencyKey || null, role: role ?? 'VIEWER' },
  })

  return NextResponse.json({ ok: true, teamId, userId })
}
