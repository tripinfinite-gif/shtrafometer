import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { isValidUserSession } from './lib/user-auth';
import { publicUrl } from './lib/base-url';

// ─── Admin auth (JWT) ───────────────────────────────────────────────

const ADMIN_SESSION_COOKIE = 'admin_session';
const USER_SESSION_COOKIE = 'user_session';

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error('[AUTH] SESSION_SECRET not configured — admin auth will fail');
    throw new Error('SESSION_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
}

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

// ─── Proxy ──────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin routes (JWT auth) ─────────────────────────────────────
  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminApi = pathname.startsWith('/api/admin');

  if (isAdminPage || isAdminApi) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

    if (!token) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(publicUrl(request, '/admin/login'));
    }

    const valid = await verifyAdminToken(token);
    if (!valid) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }
      const response = NextResponse.redirect(publicUrl(request, '/admin/login'));
      response.cookies.delete(ADMIN_SESSION_COOKIE);
      return response;
    }

    return NextResponse.next();
  }

  // ── Cabinet routes (server session auth) ────────────────────────
  const isCabinetPage = pathname.startsWith('/cabinet');
  const isCabinetApi = pathname.startsWith('/api/cabinet');

  if (isCabinetPage || isCabinetApi) {
    const sessionToken = request.cookies.get(USER_SESSION_COOKIE)?.value;

    if (!sessionToken) {
      if (isCabinetApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(publicUrl(request, '/auth/login'));
    }

    const valid = await isValidUserSession(sessionToken);
    if (!valid) {
      if (isCabinetApi) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }
      const response = NextResponse.redirect(publicUrl(request, '/auth/login'));
      response.cookies.delete(USER_SESSION_COOKIE);
      return response;
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/cabinet/:path*',
    '/api/cabinet/:path*',
  ],
};
