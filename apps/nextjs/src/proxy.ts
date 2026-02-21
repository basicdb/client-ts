import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Basic middleware for auth token checking
 * Uses the cookie set by BasicProvider
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Get token from cookie
  const token = request.cookies.get('basic_access_token')?.value

  // Log for debugging (remove in production)
  console.log('[Middleware]', path, token ? 'authenticated' : 'not authenticated')

  // Check if the URL contains a 'code' parameter (OAuth callback)
  const code = request.nextUrl.searchParams.get('code')
  if (code) {
    console.log('[Middleware] OAuth code found, allowing through')
    return NextResponse.next()
  }

  // For now, allow all requests through
  // You can add protected route logic here:
  // if (path.startsWith('/protected') && !token) {
  //   return NextResponse.redirect(new URL('/', request.url))
  // }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
