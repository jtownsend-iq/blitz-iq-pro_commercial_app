import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const priceMap: Record<string, string | undefined> = {
  standard: process.env.STRIPE_PRICE_STANDARD,
  elite: process.env.STRIPE_PRICE_ELITE,
}

const requestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  plan: z.string().default('standard'),
})

export async function POST(request: Request) {
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Missing or invalid fields.' }, { status: 400 })
  }

  const { email, name, plan } = parsed.data
  const normalizedPlan = plan.toLowerCase()
  const priceId = priceMap[normalizedPlan] ?? priceMap.standard

  if (!priceId) {
    return NextResponse.json({ error: 'No price configured for this plan.' }, { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
  })

  try {
    const existingCustomers = await stripe.customers.list({ email, limit: 1 })
    const customer =
      existingCustomers.data[0] ??
      (await stripe.customers.create({
        email,
        name,
      }))

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    })

    const paymentIntent = subscription.latest_invoice?.payment_intent
    const clientSecret =
      paymentIntent && typeof paymentIntent === 'object' ? paymentIntent.client_secret : null

    if (!clientSecret) {
      return NextResponse.json(
        { error: 'Unable to create payment intent for subscription.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      customerId: customer.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stripe error creating subscription.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
