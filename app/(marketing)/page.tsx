import Image from 'next/image'
import { redirect } from 'next/navigation'
import { LoginCard } from '@/components/auth/LoginCard'
import { createSupabaseServerClient } from '@/utils/supabase/server'

type SearchParams = {
  [key: string]: string | string[] | undefined
}

export default async function AuthGatewayPage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>
}) {
  const params = await Promise.resolve(searchParams)
  const supabase = await createSupabaseServerClient()

  const signoutRequested = params?.signout === 'true'
  if (signoutRequested) {
    await supabase.auth.signOut()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && !signoutRequested) {
    redirect('/dashboard')
  }

  const errorParam = params?.error
  const redirectParam = params?.redirectTo

  const error =
    typeof errorParam === 'string' && errorParam.length > 0 ? errorParam : undefined

  const redirectTo =
    typeof redirectParam === 'string' && redirectParam.startsWith('/') && redirectParam.length > 0
      ? redirectParam
      : '/dashboard'

  let errorMessage: string | null = null
  let infoMessage: string | null = null

  if (error === 'missing') {
    errorMessage = 'Email and password are required.'
  } else if (error === 'invalid') {
    errorMessage = "That email / password didn't work. Try again."
  } else if (typeof error === 'string') {
    errorMessage = 'We could not log you in. Please try again.'
  }

  if (signoutRequested) {
    infoMessage = 'You have been signed out.'
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[radial-gradient(circle_at_16%_18%,rgba(59,130,246,0.14),transparent_40%),radial-gradient(circle_at_82%_10%,rgba(16,185,129,0.12),transparent_38%),#020617] text-slate-50">
      <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-brand/20 blur-[90px] opacity-70" />
      <div className="absolute right-6 bottom-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-[110px] opacity-60" />

      <div className="relative mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto h-12 w-20 relative overflow-hidden">
            <Image
              src="/blitziq-logo.png"
              alt="BlitzIQ Pro logo"
              fill
              className="object-contain drop-shadow-[0_10px_30px_rgba(0,229,255,0.35)]"
              priority
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-soft">BlitzIQ Pro</p>
            <p className="text-[0.75rem] text-slate-500">Engineered to Destroy Egos.</p>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-semibold text-white">Sign in to BlitzIQ Pro</h1>
            <p className="text-sm text-slate-400">
              Access your program&apos;s film, analytics, and Friday night intel in one place.
            </p>
          </div>

          <LoginCard redirectTo={redirectTo} errorMessage={errorMessage} infoMessage={infoMessage} />
        </div>
      </div>
    </main>
  )
}
