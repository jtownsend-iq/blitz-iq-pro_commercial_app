import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabasePublicConfig } from '@/utils/supabase/publicConfig'

const PUBLIC_PATHS = ['/login', '/signup', '/invite', '/onboarding']

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path))
}

export async function middleware(request: NextRequest) {
  const publicConfig = getSupabasePublicConfig({ allowMissingInDev: false })
  if (!publicConfig) {
    throw new Error('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(publicConfig.url, publicConfig.anonKey, {
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
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, searchParams } = request.nextUrl
  const isAuthRoute = isPublicPath(pathname)

  const isApiRoute = pathname.startsWith('/api/')
  const isAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml')

  const isProtectedRoute = !isAuthRoute && !isApiRoute && !isAsset

  if (!user && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    const redirectTarget = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    loginUrl.searchParams.set('redirectTo', redirectTarget)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
