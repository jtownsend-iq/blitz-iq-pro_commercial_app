'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/utils/supabase/browser'

export default function LoginGatewayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const redirectParam = searchParams.get('redirectTo')
  const redirectTo =
    redirectParam && redirectParam.startsWith('/') ? redirectParam : '/dashboard'
  const signoutRequested = searchParams.get('signout') === 'true'
  const errorParam = searchParams.get('error')

  useEffect(() => {
    const prime = async () => {
      if (signoutRequested) {
        await supabase.auth.signOut()
        setInfo('You have been signed out.')
        return
      }

      if (errorParam === 'missing') {
        setError('Email and password are required.')
      } else if (errorParam === 'invalid') {
        setError("That email / password did not work. Try again.")
      } else if (errorParam) {
        setError('We could not log you in. Please try again.')
      }

      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.replace(redirectTo)
      }
    }

    void prime()
  }, [errorParam, redirectTo, router, signoutRequested, supabase])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setInfo(null)

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }

    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        setError("That email / password didn't work. Try again.")
        setLoading(false)
        return
      }

      router.replace(redirectTo)
      router.refresh()
    } catch (err) {
      setError('We could not log you in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[radial-gradient(circle_at_16%_18%,rgba(59,130,246,0.14),transparent_40%),radial-gradient(circle_at_82%_10%,rgba(16,185,129,0.12),transparent_38%),#020617] text-slate-50">
      <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-brand/20 blur-[90px] opacity-70" />
      <div className="absolute right-6 bottom-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-[110px] opacity-60" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-14">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="space-y-7">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-20 overflow-hidden">
                <Image
                  src="/blitziq-logo.png"
                  alt="BlitzIQ Pro logo"
                  fill
                  className="object-contain drop-shadow-[0_10px_30px_rgba(0,229,255,0.35)]"
                  priority
                />
              </div>
              <div className="leading-tight">
                <p className="text-xs uppercase tracking-[0.2em] text-brand-soft">BlitzIQ Pro</p>
                <p className="text-[0.8rem] text-slate-400">Multi-tenant access gate</p>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold text-white">Sign in to command the operation</h1>
              <p className="max-w-2xl text-sm md:text-base text-slate-400">
                One secure surface for staff logins - no pricing tables, no noise. Authenticate, enter, and pick up where
                you left off with synced charting, scouting, and call sheets.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-[0.75rem] text-slate-200">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Row-level security</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Audit-ready access</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Staff-only environment</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-white/0 to-white/0 blur-3xl opacity-50" />
            <div className="relative rounded-2xl border border-white/10 bg-black/70 p-8 shadow-[0_25px_90px_-45px_rgba(0,0,0,0.85)] backdrop-blur">
              <div className="space-y-1">
                <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-400">BlitzIQ Pro Access</p>
                <h2 className="text-2xl font-semibold text-white">Log in</h2>
                <p className="text-sm text-slate-400">Production environment</p>
              </div>

              {error ? (
                <div
                  className="mt-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </div>
              ) : null}

              {info && !error ? (
                <div
                  className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
                  role="status"
                  aria-live="polite"
                >
                  {info}
                </div>
              ) : null}

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2 text-xs">
                  <label htmlFor="email" className="flex items-center justify-between text-slate-300">
                    <span className="uppercase tracking-[0.18em]">Email</span>
                    <span className="text-[0.65rem] text-slate-500">Use your staff email</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      if (error) setError(null)
                    }}
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40"
                    required
                  />
                </div>

                <div className="space-y-2 text-xs">
                  <label htmlFor="password" className="flex items-center justify-between text-slate-300">
                    <span className="uppercase tracking-[0.18em]">Password</span>
                    <span className="text-[0.65rem] text-slate-500">Never shared or stored in logs</span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      if (error) setError(null)
                    }}
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center rounded-full bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black shadow-[0_15px_40px_-18px_rgba(0,229,255,0.7)] transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Signing in...' : 'Enter BlitzIQ Pro'}
                </button>
              </form>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[0.8rem] text-slate-400">
                <Link
                  href="/signup"
                  className="rounded-full px-2 py-1 font-semibold text-brand-soft hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/60"
                >
                  Request access
                </Link>
                <Link
                  href="/login?signout=true"
                  className="rounded-full px-2 py-1 text-slate-500 hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/50"
                >
                  Sign out of a shared device
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
