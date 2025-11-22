import { NextResponse } from 'next/server'
import { createSupabaseServiceRoleClient } from '@/utils/supabase/server'

type Intent = 'elite_availability' | 'demo_deck' | 'call_request'
type Plan = 'Elite' | 'Standard'

const allowedIntents: Intent[] = ['elite_availability', 'demo_deck', 'call_request']
const allowedPlans: Plan[] = ['Elite', 'Standard']

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const {
      name,
      role,
      school,
      state,
      classification,
      region,
      email,
      plan,
      intent,
    } = body

    const requiredFields: Array<[string, unknown]> = [
      ['name', name],
      ['role', role],
      ['school', school],
      ['state', state],
      ['classification', classification],
      ['region', region],
      ['email', email],
    ]

    for (const [key, value] of requiredFields) {
      if (typeof value !== 'string' || !value.trim()) {
        return NextResponse.json({ error: `${key} is required` }, { status: 400 })
      }
    }

    const normalizedPlan =
      typeof plan === 'string' && allowedPlans.includes(plan as Plan) ? (plan as Plan) : 'Standard'
    const normalizedIntent =
      typeof intent === 'string' && allowedIntents.includes(intent as Intent)
        ? (intent as Intent)
        : 'demo_deck'

    const service = createSupabaseServiceRoleClient()
    const { error } = await service.from('marketing_leads').insert({
      name: (name as string).trim(),
      role: (role as string).trim(),
      school: (school as string).trim(),
      state: (state as string).trim(),
      classification: (classification as string).trim(),
      region: (region as string).trim(),
      email: (email as string).trim(),
      plan: normalizedPlan,
      intent: normalizedIntent,
    })

    if (error) {
      console.error('Contact submission error:', error.message)
      return NextResponse.json({ error: 'Failed to record your request.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, intent: normalizedIntent })
  } catch (err) {
    console.error('Contact submission unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 })
  }
}
