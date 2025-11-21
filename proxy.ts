// proxy.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export default async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Do not put logic between client creation and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl
  const pathname = url.pathname
  const searchParams = url.searchParams

  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/games') ||
    pathname.startsWith('/scouting') ||
    pathname.startsWith('/players') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/onboarding')

  // Logged-in user hitting auth pages -> send to dashboard
  if (user && isAuthRoute) {
    const redirectUrl = url.clone()
    redirectUrl.pathname = '/dashboard'
    redirectUrl.searchParams.delete('error')
    redirectUrl.searchParams.delete('message')
    return NextResponse.redirect(redirectUrl)
  }

  // Not logged in and trying to hit protected routes -> send to login
  if (!user && isProtectedRoute) {
    const loginUrl = url.clone()
    loginUrl.pathname = '/login'

    const redirectTarget =
      pathname +
      (searchParams.toString() ? `?${searchParams.toString()}` : '')

    loginUrl.searchParams.set('redirectTo', redirectTarget)

    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/games/:path*',
    '/scouting/:path*',
    '/players/:path*',
    '/settings/:path*',
    '/onboarding/:path*',
  ],
}
