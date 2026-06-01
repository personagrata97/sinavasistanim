import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const isAuth = !!req.nextauth.token
    const isAuthPage = req.nextUrl.pathname.startsWith('/login')
    const isOnboardingPage = req.nextUrl.pathname.startsWith('/onboarding')
    const hasCompletedOnboarding = req.nextauth.token?.onboardingCompleted

    if (isAuth && !hasCompletedOnboarding && !isOnboardingPage) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }

    // Security headers
    const response = NextResponse.next()
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    return response
  },
  {
    pages: {
      signIn: "/login",
    },
  }
)

export const config = {
  matcher: ["/program/:path*", "/dashboard/:path*", "/onboarding"],
}
