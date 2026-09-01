import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { fetchWithTimeout } from './lib/supabase/fetch-with-timeout'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isLoginRoute = pathname === '/admin/login'
  const isForbiddenLogin = isLoginRoute && request.nextUrl.searchParams.get('error') === 'forbidden'

  // The shared admin layout also runs for `/admin/login`. Forward a trusted
  // request marker so the layout can skip its admin check on that page.
  const forwardedRequestHeaders = new Headers(request.headers)
  forwardedRequestHeaders.delete('x-is-login-route')
  if (isLoginRoute) {
    forwardedRequestHeaders.set('x-is-login-route', '1')
  }

  const nextResponse = () => {
    // Keep the cookie header in sync when Supabase refreshes a session in
    // `setAll`, while forwarding the login marker to server components.
    const headers = new Headers(forwardedRequestHeaders)
    headers.set('cookie', request.cookies.toString())
    return NextResponse.next({ request: { headers } })
  }

  let supabaseResponse = nextResponse()

  // Redirects create a new response object. Copy refreshed Supabase cookies
  // onto it so a cold login/refresh does not lose the session.
  const redirectWithCookies = (url: URL) => {
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { fetch: fetchWithTimeout },
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = nextResponse()
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user && isLoginRoute && !isForbiddenLogin) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return redirectWithCookies(url)
    }

    if (!user && !isLoginRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return redirectWithCookies(url)
    }
  } catch {
    // Keep the login page renderable when Supabase is unavailable. Protected
    // routes still redirect to login so they never render unauthenticated data.
    if (!isLoginRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return redirectWithCookies(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
