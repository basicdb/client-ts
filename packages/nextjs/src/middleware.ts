import { NextRequest, NextResponse } from 'next/server'

/**
 * Configuration options for the Basic auth middleware
 */
export interface BasicMiddlewareConfig {
  /**
   * Routes that require authentication
   * Supports glob patterns like '/dashboard/*', '/api/protected/*'
   */
  protectedRoutes?: string[]
  
  /**
   * Routes that are always public (bypass auth check)
   * Useful for login pages, public APIs, etc.
   */
  publicRoutes?: string[]
  
  /**
   * Where to redirect unauthenticated users
   * @default '/login'
   */
  signInUrl?: string
  
  /**
   * Where to redirect after successful sign-in
   * @default '/'
   */
  afterSignInUrl?: string
  
  /**
   * Cookie name for the access token
   * @default 'basic_access_token'
   */
  tokenCookieName?: string
  
  /**
   * Cookie name for the full token object
   * @default 'basic_token'
   */
  fullTokenCookieName?: string
}

const DEFAULT_CONFIG: Required<BasicMiddlewareConfig> = {
  protectedRoutes: [],
  publicRoutes: ['/login', '/signup', '/auth/*'],
  signInUrl: '/login',
  afterSignInUrl: '/',
  tokenCookieName: 'basic_access_token',
  fullTokenCookieName: 'basic_token'
}

/**
 * Check if a path matches any of the patterns
 * Supports simple glob patterns with * wildcard
 */
function matchesPattern(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')  // Replace * with .*
      .replace(/\//g, '\\/')  // Escape slashes
    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(path)
  })
}

/**
 * Check if the user has a valid token
 */
function hasValidToken(request: NextRequest, config: Required<BasicMiddlewareConfig>): boolean {
  const token = request.cookies.get(config.tokenCookieName)?.value
  
  if (!token) {
    return false
  }
  
  // Basic validation - token exists and is not empty
  // For more thorough validation, you'd decode the JWT and check expiry
  // But that adds latency to every request
  return token.length > 0
}

/**
 * Get auth info from cookies
 */
export function getAuthFromRequest(request: NextRequest, config?: Partial<BasicMiddlewareConfig>): {
  isAuthenticated: boolean
  token: string | null
} {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  const token = request.cookies.get(mergedConfig.tokenCookieName)?.value || null
  
  return {
    isAuthenticated: !!token && token.length > 0,
    token
  }
}

/**
 * Create a Basic auth middleware for NextJS
 * 
 * @example
 * // In middleware.ts at the root of your NextJS app:
 * import { createBasicMiddleware } from '@basictech/nextjs'
 * 
 * export const middleware = createBasicMiddleware({
 *   protectedRoutes: ['/dashboard/*', '/settings/*'],
 *   publicRoutes: ['/login', '/signup', '/'],
 *   signInUrl: '/login'
 * })
 * 
 * export const config = {
 *   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
 * }
 */
export function createBasicMiddleware(config?: BasicMiddlewareConfig) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  return function middleware(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl
    
    // Skip middleware for static files and Next.js internals
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api/_next') ||
      pathname.includes('.') // Static files like .css, .js, .ico
    ) {
      return NextResponse.next()
    }
    
    // Check if route is explicitly public
    if (matchesPattern(pathname, mergedConfig.publicRoutes)) {
      return NextResponse.next()
    }
    
    // Check if route is protected
    const isProtectedRoute = mergedConfig.protectedRoutes.length === 0 
      ? true  // If no protected routes specified, protect everything except public
      : matchesPattern(pathname, mergedConfig.protectedRoutes)
    
    if (!isProtectedRoute) {
      return NextResponse.next()
    }
    
    // Check authentication
    const isAuthenticated = hasValidToken(request, mergedConfig)
    
    if (!isAuthenticated) {
      // Redirect to sign-in page with return URL
      const signInUrl = new URL(mergedConfig.signInUrl, request.url)
      signInUrl.searchParams.set('returnUrl', pathname)
      
      return NextResponse.redirect(signInUrl)
    }
    
    // User is authenticated, allow the request
    return NextResponse.next()
  }
}

/**
 * Simple auth check middleware - redirects unauthenticated users
 * 
 * @example
 * // In middleware.ts
 * import { withBasicAuth } from '@basictech/nextjs'
 * 
 * export const middleware = withBasicAuth
 * 
 * export const config = {
 *   matcher: ['/dashboard/:path*', '/settings/:path*']
 * }
 */
export function withBasicAuth(request: NextRequest): NextResponse {
  return createBasicMiddleware()(request)
}

/**
 * Helper to get the return URL from search params
 */
export function getReturnUrl(request: NextRequest, defaultUrl: string = '/'): string {
  const returnUrl = request.nextUrl.searchParams.get('returnUrl')
  return returnUrl || defaultUrl
}

