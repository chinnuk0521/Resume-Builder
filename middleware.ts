import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle favicon.ico requests - redirect to icon.svg
  if (request.nextUrl.pathname === '/favicon.ico') {
    return NextResponse.rewrite(new URL('/icon.svg', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/favicon.ico',
}

