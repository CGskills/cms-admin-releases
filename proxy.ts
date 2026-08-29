import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isLoginRoute = pathname === '/admin/login'
  const isForbiddenLogin = isLoginRoute && request.nextUrl.searchParams.get('error') === 'forbidden'

  // The shared admin layout runs for `/admin/login` as well.  Pass an
  // explicit request header to the server component so it can skip the
  // authenticated shell for the login page.  A response header is only sent
  // to the browser and is not available to `headers()` during the render;
  // using the request override avoids the redirect loop that can otherwise
  // appear on a cold production/Electron navigation.
  const forwardedRequestHeaders = new Headers(request.headers)
  // Never trust a client-provided marker on protected routes: otherwise a
  // caller could make the shared layout skip its admin authorization check.
  forwardedRequestHeaders.delete('x-is-login-route')
  if (isLoginRoute) {
    forwardedRequestHeaders.set('x-is-login-route', '1')
  }

  const nextResponse = () => {
    // Keep the cookie header in sync when Supabase refreshes a session in
    // `setAll`.  This preserves the normal Supabase SSR cookie flow while
    // forwarding the login marker upstream to the server component.
    const headers = new Headers(forwardedRequestHeaders)
    headers.set('cookie', request.cookies.toString())
    return NextResponse.next({ request: { headers } })
  }

  let supabaseResponse = nextResponse()

  // Redirects create a new response object. Copy any refreshed Supabase
  // session cookies onto that response, otherwise a cold login/refresh can
  // authenticate the current render but lose the refreshed token before the
  // redirected `/admin` request arrives.
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
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = nextResponse()
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Authenticated user on login page → redirect to admin
    if (user && isLoginRoute && !isForbiddenLogin) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return redirectWithCookies(url)
    }

    // Unauthenticated user on non-login admin route → redirect to login
    if (!user && !isLoginRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return redirectWithCookies(url)
    }

    // Login page without session → let it through
  } catch {
    // On error, redirect to login (except if already on login)
    if (!isLoginRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return redirectWithCookies(url)
    }

    // Keep the login page renderable when Supabase is temporarily unavailable
    // or misconfigured. The request marker above prevents the shared admin
    // layout from redirecting back to the same URL.
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
}
