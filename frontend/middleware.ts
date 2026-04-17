import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

import { COOKIE_NAME, dashboardPathForRole, roleFromPath } from '@/lib/auth';
import type { UserRole } from '@/lib/api';

const PUBLIC_PREFIXES = ['/college', '/api', '/_next', '/favicon', '/icons', '/manifest'];
const AUTH_PAGES = ['/login', '/register'];

async function verifyToken(
  token: string,
): Promise<{ sub: string; role: UserRole } | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const role = payload.role as UserRole | undefined;
    const sub = typeof payload.sub === 'string' ? payload.sub : null;
    if (!role || !sub) return null;
    return { sub, role };
  } catch {
    return null;
  }
}

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return false;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Authenticated users on login/register → send to their dashboard
  if (isAuthPage) {
    if (session) {
      return NextResponse.redirect(
        new URL(dashboardPathForRole(session.role), req.url),
      );
    }
    return NextResponse.next();
  }

  // Root → login (unauth) or dashboard (auth)
  if (pathname === '/') {
    const target = session ? dashboardPathForRole(session.role) : '/login';
    return NextResponse.redirect(new URL(target, req.url));
  }

  // All other paths require a session
  if (!session) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Role-prefix guard: `/student/*`, `/faculty/*`, `/admin/*`
  const requiredRole = roleFromPath(pathname);
  if (requiredRole && requiredRole !== session.role) {
    return NextResponse.redirect(
      new URL(dashboardPathForRole(session.role), req.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/.*|manifest.json|sw.js|workbox-.*).*)'],
};
