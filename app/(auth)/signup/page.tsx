// app/(auth)/signup/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { loadStripe } from '@stripe/stripe-js'
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js'
import { createSupabaseBrowserClient } from '@/utils/supabase/browser'

type PlanOption = {
  id: 'standard' | 'elite'
  label: string
  price: string
  description: string
}

const plans: PlanOption[] = [
  { id: 'standard', label: 'Standard', price: '$299/mo', description: 'Core charting and scouting.' },
  { id: 'elite', label: 'Elite', price: 'Custom', description: 'White-glove setup and support.' },
]

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = publishableKey ? loadStripe(publishableKey) : null

function SignupForm() {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null
  try {
    supabase = createSupabaseBrowserClient()
  } catch (err) {
    console.warn(
      'Signup Supabase client unavailable: check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
      err
    )
  }

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [plan, setPlan] = useState<PlanOption['id']>('standard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!stripe || !elements) {
      setError('Stripe is not ready. Please try again.')
      return
    }

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email, and password are required.')
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setError('Add your card details to continue.')
      return
    }

    setLoading(true)

    try {
      if (!supabase) {
        throw new Error('Supabase not configured for signup.')
      }
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, plan }),
      })

      if (!response.ok) {
        const json = await response.json().catch(() => null)
        const message = json?.error || 'Unable to start billing.'
        setError(message)
        setLoading(false)
        return
      }

      const { clientSecret } = await response.json()

      const confirmation = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name,
            email,
          },
        },
      })

      if (confirmation.error) {
        setError(confirmation.error.message || 'Card confirmation failed.')
        setLoading(false)
        return
      }

      if (confirmation.paymentIntent?.status !== 'succeeded') {
        setError('Payment did not complete. Please try again.')
        setLoading(false)
        return
      }

      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, plan },
        },
      })

      if (signUpError) {
        setError(signUpError.message || 'Sign up failed.')
        setLoading(false)
        return
      }

      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          setError(signInError.message || 'Sign in failed after payment.')
          setLoading(false)
          return
        }
      }

      router.push('/dashboard')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. If you were charged, try logging in.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-slate-300">
          <span className="block text-slate-400 uppercase tracking-[0.18em]">Full name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            placeholder="Your name"
          />
        </label>
        <label className="space-y-1 text-xs text-slate-300">
          <span className="block text-slate-400 uppercase tracking-[0.18em]">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            placeholder="coach@program.edu"
          />
        </label>
      </div>
      <label className="space-y-1 text-xs text-slate-300">
        <span className="block text-slate-400 uppercase tracking-[0.18em]">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          placeholder="At least 8 characters"
        />
      </label>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Select your plan</p>
        <p className="text-xs text-slate-500">
          This drives the price we charge when you submit. The selection below is the source of truth.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {plans.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPlan(option.id)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                plan === option.id
                  ? 'border-brand bg-brand/10 text-white'
                  : 'border-slate-800 bg-black/40 text-slate-200 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="text-xs text-slate-400">{option.price}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Card details</p>
        <div className="rounded-lg border border-slate-700 bg-black/40 px-3 py-3">
          <CardElement
            options={{
              style: {
                base: {
                  color: '#e2e8f0',
                  fontSize: '14px',
                  '::placeholder': { color: '#94a3b8' },
                },
                invalid: { color: '#f59e0b' },
              },
            }}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100" role="alert">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center rounded-full bg-brand text-black text-xs font-semibold tracking-[0.16em] uppercase py-2 hover:bg-brand-soft transition-colors disabled:opacity-60"
      >
        {loading ? 'Processing...' : 'Start membership'}
      </button>
    </form>
  )
}

export default function SignupPage() {
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient()
    } catch (err) {
      console.warn('Signup Supabase session check skipped: not configured', err)
      return null
    }
  }, [])
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        setHasSession(false)
        return
      }
      const { data } = await supabase.auth.getSession()
      setHasSession(Boolean(data.session))
    }
    void checkSession()
  }, [supabase])

  if (!stripePromise) {
    return (
      <section className="min-h-[60vh] flex items-center justify-center text-foreground">
        <div className="w-full max-w-2xl space-y-4 bg-surface-raised border border-slate-800 rounded-2xl p-8 shadow-brand-card">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-400">BlitzIQ Pro</p>
          <p className="text-xs text-slate-500">Engineered to Destroy Egos.</p>
          <p className="text-sm text-amber-200">
            Stripe is not configured. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to continue.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-[60vh] flex items-center justify-center text-foreground">
      <div className="w-full max-w-2xl space-y-6 bg-surface-raised border border-slate-800 rounded-2xl p-8 shadow-brand-card">
        <Script src="https://js.stripe.com/v3/pricing-table.js" async />
        <header className="space-y-2">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-400">BlitzIQ Pro</p>
          <p className="text-xs text-slate-500">Engineered to Destroy Egos.</p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-50">Create your account</h1>
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-soft hover:text-brand">
              Log in
            </Link>
          </p>
        </header>

        {hasSession ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            You are currently signed in. Go to your dashboard or sign out before creating a new membership.
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-black hover:bg-brand-soft"
              >
                Go to dashboard
              </Link>
              <Link
                href="/login?signout=true"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 hover:border-brand hover:text-white"
              >
                Sign out
              </Link>
            </div>
          </div>
        ) : null}

        <div className="space-y-2 rounded-2xl border border-slate-800 bg-black/30 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Plan overview</p>
          <p className="text-sm text-slate-400">
            Compare plans below, then select your plan in the form to charge the correct price.
          </p>
          <stripe-pricing-table
            pricing-table-id="prctbl_1SYaKWJyxtwFIImrpT9I4WRr"
            publishable-key={publishableKey}
            class="pointer-events-none opacity-80"
          />
        </div>

        <Elements stripe={stripePromise}>
          <SignupForm />
        </Elements>
      </div>
    </section>
  )
}
