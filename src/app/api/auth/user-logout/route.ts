import { NextRequest, NextResponse } from 'next/server';
import { deleteUserSession, USER_SESSION_COOKIE_NAME } from '@/lib/user-auth';

// ─── POST /api/auth/user-logout ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(USER_SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await deleteUserSession(sessionToken).catch(() => { /* ignore */ });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(USER_SESSION_COOKIE_NAME);
  return response;
}
