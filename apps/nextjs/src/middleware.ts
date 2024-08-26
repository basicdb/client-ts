
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// return NextResponse.redirect(new URL('/login', request.url))

function GetToken(request: NextRequest) {
  const token = request.cookies.get('basic_token')?.value

  
  return token
}



export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  console.log("middleware", path)
  const token = GetToken(request)
  console.log("token", token)

  // Check if the URL contains a 'code' parameter
  const code = request.nextUrl.searchParams.get('code')
  if (code) {
    console.log("Code found in URL:", code)

    
  }

  // If it's the root path, just render it
  if (path === '/') {
    return NextResponse.next()
  }

  // Check if there's a token in the request cookies


  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
