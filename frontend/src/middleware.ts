import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE = 'SIGMUN_AUTH';
const LOGIN_PATH = '/';
const DASHBOARD_PATH = '/dashboard';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get(AUTH_COOKIE);

  const isDashboardRoute = pathname.startsWith(DASHBOARD_PATH);
  const isLoginPage = pathname === LOGIN_PATH;
  const isStatic =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/logo_sat_2026.jpeg';

  if (isStatic) return NextResponse.next();

  if (isDashboardRoute && !authCookie?.value) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  if (isLoginPage && authCookie?.value) {
    return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
