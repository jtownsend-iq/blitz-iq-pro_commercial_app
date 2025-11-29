import Link from 'next/link'
import { login } from '@/app/auth-actions'

type LoginCardProps = {
  redirectTo: string
  errorMessage?: string | null
  infoMessage?: string | null
}

export function LoginCard({ redirectTo, errorMessage, infoMessage }: LoginCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/70 p-8 shadow-[0_25px_90px_-45px_rgba(0,0,0,0.85)] backdrop-blur">
      <div className="space-y-1">
        <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-400">BlitzIQ Pro Access</p>
        <h2 className="text-2xl font-semibold text-white">Sign in to BlitzIQ Pro</h2>
        <p className="text-sm text-slate-400">Access your program&apos;s film, analytics, and Friday night intel.</p>
      </div>

      {errorMessage ? (
        <div
          className="mt-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
          role="alert"
          aria-live="assertive"
        >
          {errorMessage}
        </div>
      ) : null}

      {infoMessage && !errorMessage ? (
        <div
          className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
          role="status"
          aria-live="polite"
        >
          {infoMessage}
        </div>
      ) : null}

      <form className="mt-6 space-y-4" action={login}>
        <input type="hidden" name="redirectTo" value={redirectTo} />

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
            className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center rounded-full bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black shadow-[0_15px_40px_-18px_rgba(0,229,255,0.7)] transition hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Enter BlitzIQ Pro
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[0.8rem] text-slate-400">
        <Link
          href="/signup"
          className="rounded-full px-2 py-1 font-semibold text-brand-soft hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/60"
        >
          Request access
        </Link>
        <span className="text-slate-500">Having trouble signing in? Contact your program admin.</span>
      </div>
    </div>
  )
}
