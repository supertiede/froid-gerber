import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const PUBLIC_PATHS = ['/login', '/api/auth']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Force password change on first login
  if (
    session.user.doitChangerMotDePasse &&
    pathname !== '/changer-mot-de-passe'
  ) {
    return NextResponse.redirect(new URL('/changer-mot-de-passe', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)'],
}
