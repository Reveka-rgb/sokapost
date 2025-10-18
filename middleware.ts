import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const isPublicRoute = pathname === '/login' || pathname === '/register'
  
  // Check if user has session cookie (Better Auth uses different cookie names)
  // Check all possible Better Auth cookie variations
  const cookies = request.cookies.getAll()
  const hasSessionCookie = cookies.some(cookie => 
    cookie.name.includes('better') && cookie.name.includes('session')
  )
  const isLoggedIn = hasSessionCookie

  // If logged in and trying to access login/register, redirect to calendar
  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL('/calendar', request.url))
  }

  // If not logged in and trying to access protected route, redirect to login
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Add security headers
  const response = NextResponse.next()
  const headers = response.headers

  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY')
  
  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff')
  
  // XSS Protection
  headers.set('X-XSS-Protection', '1; mode=block')
  
  // Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy (disable unnecessary features)
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // Strict Transport Security (HTTPS only in production)
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|uploads|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
}
