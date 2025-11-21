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
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
            BlitzIQ Pro | Early Access
          </p>
          <h1 className="text-2xl md:text-3xl font-bold">
            Request early access to BlitzIQ Pro
          </h1>
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-soft hover:text-brand">
              Log in
            </Link>
          </p>
        </header>

        <div className="h-40 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-sm">
          Coming soon: onboarding workflow for staff invites + tenant creation.
        </div>
      </div>
    </section>
  )
}
