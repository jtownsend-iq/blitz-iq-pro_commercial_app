// app/signup/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function SignupPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If they're already logged in, no need for signup → send to app
  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center text-foreground">
      <div className="w-full max-w-2xl space-y-6 bg-surface-raised border border-slate-800 rounded-2xl p-8 shadow-brand-card">
        <header className="space-y-2">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
            BlitzIQ Pro • Early Access
          </p>
          <h1 className="text-2xl md:text-3xl font-bold">
            Request early access to BlitzIQ Pro
          </h1>
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-500 hover:underline">
              Log in
            </Link>
          </p>
        </header>
      </div>
    </main>
  )
}
