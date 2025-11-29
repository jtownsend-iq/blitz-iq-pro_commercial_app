import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServiceRoleClient } from '@/utils/supabase/server'
import { jsonError, jsonOk } from '@/utils/api/responses'

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const stringField = z.string().trim().min(1, 'Required')

const payloadSchema = z.object({
  name: stringField,
  role: stringField,
  school: stringField,
  state: stringField,
  classification: stringField,
  region: stringField,
  email: stringField.regex(emailPattern, 'Enter a valid email address.'),
  plan: z.enum(['Elite', 'Standard']),
  intent: z.enum(['elite_availability', 'demo_deck', 'call_request']),
})

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown
    const parsed = payloadSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError('Invalid submission. Please check required fields.', 400)
    }

    const payload = parsed.data

    const service = createSupabaseServiceRoleClient()
    const { error } = await service.from('marketing_leads').insert({
      name: payload.name,
      role: payload.role,
      school: payload.school,
      state: payload.state,
      classification: payload.classification,
      region: payload.region,
      email: payload.email,
      plan: payload.plan,
      intent: payload.intent,
    })

    if (error) {
      console.error('Contact submission error:', { message: error.message, code: error.code })
      return jsonError('Failed to record your request.', 500)
    }

    return jsonOk({ intent: payload.intent })
  } catch (err) {
    console.error('Contact submission unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 })
  }
}
