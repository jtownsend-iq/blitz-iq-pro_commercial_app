import { NextResponse } from 'next/server'
import { createSupabaseServiceRoleClient } from '@/utils/supabase/server'

type Intent = 'elite_availability' | 'demo_deck' | 'call_request'
type Plan = 'Elite' | 'Standard'

const allowedIntents: Intent[] = ['elite_availability', 'demo_deck', 'call_request']
const allowedPlans: Plan[] = ['Elite', 'Standard']
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

type ContactPayload = {
  name: string
  role: string
  school: string
  state: string
  classification: string
  region: string
  email: string
  plan: Plan
  intent: Intent
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>

    const fields: Record<keyof ContactPayload, unknown> = {
      name: body.name,
      role: body.role,
      school: body.school,
      state: body.state,
      classification: body.classification,
      region: body.region,
      email: body.email,
      plan: body.plan,
      intent: body.intent,
    }

    for (const [key, value] of Object.entries(fields)) {
      if (typeof value !== 'string' || !value.trim()) {
        return badRequest(`${key} is required`)
      }
    }

    const trimmed = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, (value as string).trim()])
    ) as Record<keyof ContactPayload, string>

    if (!emailPattern.test(trimmed.email)) {
      return badRequest('Enter a valid email address.')
    }

    const normalizedPlan = trimmed.plan as Plan
    const normalizedIntent = trimmed.intent as Intent

    if (!allowedPlans.includes(normalizedPlan)) {
      return badRequest('Invalid plan.')
    }

    if (!allowedIntents.includes(normalizedIntent)) {
      return badRequest('Invalid intent.')
    }

    const service = createSupabaseServiceRoleClient()
    const { error } = await service.from('marketing_leads').insert({
      name: trimmed.name,
      role: trimmed.role,
      school: trimmed.school,
      state: trimmed.state,
      classification: trimmed.classification,
      region: trimmed.region,
      email: trimmed.email,
      plan: normalizedPlan,
      intent: normalizedIntent,
    })

    if (error) {
      console.error('Contact submission error:', { message: error.message, code: error.code })
      return NextResponse.json({ error: 'Failed to record your request.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, intent: normalizedIntent })
  } catch (err) {
    console.error('Contact submission unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 })
  }
}
