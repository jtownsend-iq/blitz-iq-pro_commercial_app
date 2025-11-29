// app/login/page.tsx
import { redirect } from 'next/navigation'
import { LoginCard } from '@/components/auth/LoginCard'
import { createSupabaseServerClient } from '@/utils/supabase/server'

type SearchParams = {
  [key: string]: string | string[] | undefined
}

export default async function LoginPage({
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
    <main className="min-h-[60vh] flex items-center justify-center text-foreground px-4 py-10">
      <div className="w-full max-w-md">
        <LoginCard redirectTo={redirectTo} errorMessage={errorMessage} infoMessage={infoMessage} />
      </div>
    </main>
  )
}
