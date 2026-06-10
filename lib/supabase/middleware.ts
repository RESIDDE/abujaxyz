import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { nextUrl } = request
  const isLoginPage = nextUrl.pathname === "/login"
  const isSignupPage = nextUrl.pathname === "/signup"
  const isAdminPage = nextUrl.pathname.startsWith("/admin")
  const isApiAuth = nextUrl.pathname.startsWith("/api/auth")
  const isWebhook = nextUrl.pathname.startsWith("/api/webhooks")

  if (isApiAuth || isWebhook) return response

  if (!user && !isLoginPage && !isSignupPage) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  if (user && (isLoginPage || isSignupPage)) {
    return NextResponse.redirect(new URL("/inbox", nextUrl))
  }

  if (isAdminPage && user) {
    // In Supabase, you might store roles in user metadata
    if (user.user_metadata?.role !== "SUPERADMIN") {
      return NextResponse.redirect(new URL("/inbox", nextUrl))
    }
  }

  return response
}
