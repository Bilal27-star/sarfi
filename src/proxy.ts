import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js 16 proxy (successor of middleware.ts).
 * Fast cookie-presence gate only — real session validation happens in
 * server layouts/data functions against the database. A present-but-stale
 * cookie is handled there too, which is why guest routes are NOT gated here
 * (doing so on cookie presence alone would create a redirect loop).
 */
const APP_ROUTES = ['/home', '/transactions', '/insights', '/profile', '/setup']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSessionCookie = Boolean(request.cookies.get('sarfi_session')?.value)

  if (!hasSessionCookie && APP_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/home/:path*', '/transactions/:path*', '/insights/:path*', '/profile/:path*', '/setup'],
}
