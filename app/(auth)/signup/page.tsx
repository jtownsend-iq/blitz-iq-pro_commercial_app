// app/(auth)/signup/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export default async function SignupPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <section className="min-h-[60vh] flex items-center justify-center text-foreground">
      <div className="w-full max-w-2xl space-y-6 bg-surface-raised border border-slate-800 rounded-2xl p-8 shadow-brand-card">
        <header className="space-y-2">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-400">BlitzIQ Pro</p>
          <p className="text-xs text-slate-500">Engineered to Destroy Egos.</p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-50">Request access to BlitzIQ Pro</h1>
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-soft hover:text-brand">
              Log in
            </Link>
          </p>
        </header>

        <div className="space-y-3 rounded-xl border border-slate-800 bg-black/40 p-5 text-sm text-slate-300">
          <p>Early access is invite-only while we onboard new programs.</p>
          <p>Check your email for an invite link from your staff, or request access and we will follow up quickly.</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-black hover:bg-brand-soft transition-colors"
            >
              Request access
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 hover:border-brand hover:text-white transition-colors"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
