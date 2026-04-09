import { SignJWT, jwtVerify } from 'jose';
import { compare, hash } from 'bcryptjs';
import { cookies } from 'next/headers';
import type { SessionPayload } from './types';

const SESSION_COOKIE = 'admin_session';
const SESSION_DURATION = 60 * 60 * 24; // 24 hours in seconds

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not set in environment variables');
  }
  return new TextEncoder().encode(secret);
}

// ─── Password ───────────────────────────────────────────────────────

/** Hash a password (used once to generate ADMIN_PASSWORD_HASH for .env.local) */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

/** Verify password against the stored hash (base64-encoded in env) */
export async function verifyPassword(password: string): Promise<boolean> {
  const b64 = process.env.ADMIN_PASSWORD_HASH_B64;
  if (!b64) {
    throw new Error('ADMIN_PASSWORD_HASH_B64 is not set in environment variables');
  }
  const storedHash = Buffer.from(b64, 'base64').toString('utf-8');
  return compare(password, storedHash);
}

// ─── JWT session ────────────────────────────────────────────────────

/** Create a signed JWT token */
export async function createSession(): Promise<string> {
  const payload: SessionPayload = {
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION,
  };

  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());
}

/** Verify a JWT token and return the payload */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Cookie helpers ─────────────────────────────────────────────────

/** Set session cookie after successful login */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

/** Get session token from cookies */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/** Delete session cookie */
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Check if the current request is authenticated */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getSessionToken();
  if (!token) return false;
  const session = await verifySession(token);
  return session !== null;
}
