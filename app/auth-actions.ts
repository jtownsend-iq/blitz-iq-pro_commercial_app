// app/auth-actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/clients'

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')
  const redirectToRaw = formData.get('redirectTo')
  const redirectTo =
    typeof redirectToRaw === 'string' && redirectToRaw.length > 0
      ? redirectToRaw
      : '/dashboard'

  if (!email || !password) {
    redirect('/login?error=missing')
  }

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Login error:', error.message)
    redirect('/login?error=invalid')
  }

  // Successful login → go where we meant to go
  redirect(redirectTo)
}

export async function logout() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
