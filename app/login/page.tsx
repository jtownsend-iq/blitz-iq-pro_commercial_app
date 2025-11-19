// app/login/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { login } from '../auth-actions'

type SearchParams = {
  [key: string]: string | string[] | undefined
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Already signed in → straight to the app
  if (user) {
    redirect('/dashboard')
  }

  const errorParam = params?.error
  const redirectParam = params?.redirectTo

  const error =
    typeof errorParam === 'string' && errorParam.length > 0
      ? errorParam
      : undefined

  const redirectTo =
    typeof redirectParam === 'string' && redirectParam.length > 0
      ? redirectParam
      : '/dashboard'

  let errorMessage: string | null = null

  if (error === 'missing') {
    errorMessage = 'Email and password are required.'
  } else if (error === 'invalid') {
    errorMessage = "That email / password didn't work. Try again."
  } else if (typeof error === 'string') {
    errorMessage = 'We could not log you in. Please try again.'
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center text-foreground">
      <div className="w-full max-w-md space-y-6 bg-surface-raised border border-slate-800 rounded-2xl p-8 shadow-brand-card">
        <header className="space-y-2">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
            BlitzIQ Pro
          </p>
        </header>

        {errorMessage && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[0.7rem] text-red-200">
            {errorMessage}
          </div>
        )}

        <form action={login} className="space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div className="space-y-1 text-xs">
            <label
              htmlFor="email"
              className="block text-slate-300 font-medium"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div className="space-y-1 text-xs">
            <label
              htmlFor="password"
              className="block text-slate-300 font-medium"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center rounded-full bg-brand text-black text-xs font-semibold tracking-[0.16em] uppercase py-2 hover:bg-brand-soft transition-colors"
          >
            Log In
          </button>
        </form>

        <div className="flex items-center justify-between text-[0.7rem] text-slate-500">
          <span>Need access?</span>
          <Link
            href="/signup"
            className="font-semibold text-brand-soft hover:text-brand transition-colors"
          >
            Request early access
          </Link>
        </div>
      </div>
    </main>
  )
}