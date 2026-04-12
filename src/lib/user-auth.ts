import { randomUUID, randomInt } from 'crypto';
import { cookies } from 'next/headers';
import { query } from './db';
import { sendOtpSms } from './sms';
import type { User, UserSession } from './types';

// ─── Constants ──────────────────────────────────────────────────────

const USER_SESSION_COOKIE = 'user_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_RENEWAL_THRESHOLD_MS = 60 * 60 * 1000;  // 1 hour
const OTP_TTL_MS = 5 * 60 * 1000;                     // 5 minutes
const OTP_MAX_ATTEMPTS = 3;
const OTP_COOLDOWN_MS = 60 * 1000;                     // 60 sec between sends
const OTP_MAX_PER_PHONE_10MIN = 3;
const OTP_MAX_PER_IP_10MIN = 5;

// ─── Phone normalization ────────────────────────────────────────────

/** Normalize phone to +7XXXXXXXXXX format */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('8') && digits.length === 11) {
    return '+7' + digits.slice(1);
  }
  if (digits.startsWith('7') && digits.length === 11) {
    return '+7' + digits.slice(1);
  }
  if (digits.length === 10) {
    return '+7' + digits;
  }
  // Already has country code
  if (phone.startsWith('+7') && digits.length === 11) {
    return '+7' + digits.slice(1);
  }
  return '+' + digits;
}

/** Validate that phone looks like a Russian mobile */
export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^\+7\d{10}$/.test(normalized);
}

// ─── OTP ────────────────────────────────────────────────────────────

/** Generate a 6-digit OTP code */
function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

/** Check rate limits before sending OTP */
export async function checkOtpRateLimit(phone: string, ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const normalized = normalizePhone(phone);

  // Check cooldown: last OTP sent to this phone
  const lastOtp = await query<{ created_at: string }>(
    `SELECT created_at FROM otp_codes
     WHERE phone = $1 AND created_at > NOW() - INTERVAL '60 seconds'
     ORDER BY created_at DESC LIMIT 1`,
    [normalized],
  );
  if (lastOtp.rows.length > 0) {
    const sent = new Date(lastOtp.rows[0].created_at).getTime();
    const retryAfter = Math.ceil((sent + OTP_COOLDOWN_MS - Date.now()) / 1000);
    return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
  }

  // Check phone rate: max 3 per 10 min
  const phoneCount = await query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM otp_codes
     WHERE phone = $1 AND created_at > NOW() - INTERVAL '10 minutes'`,
    [normalized],
  );
  if (Number(phoneCount.rows[0].cnt) >= OTP_MAX_PER_PHONE_10MIN) {
    return { allowed: false, retryAfter: 600 };
  }

  // IP rate limiting handled at API route level via in-memory map
  return { allowed: true };
}

/** Send OTP to phone. Returns success or error. */
export async function sendOtp(phone: string): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizePhone(phone);
  const code = generateOtp();
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // Save OTP to database
  await query(
    `INSERT INTO otp_codes (id, phone, code, purpose, expires_at)
     VALUES ($1, $2, $3, 'login', $4)`,
    [id, normalized, code, expiresAt.toISOString()],
  );

  // Send SMS
  const result = await sendOtpSms(normalized, code);
  if (!result.success) {
    console.error('[OTP] SMS send failed:', result.error);
    return { success: false, error: 'Не удалось отправить SMS. Попробуйте позже.' };
  }

  return { success: true };
}

/** Verify OTP code. Returns user if valid, null if not. */
export async function verifyOtp(
  phone: string,
  code: string,
  name?: string,
): Promise<{ success: boolean; user?: User; isNewUser?: boolean; error?: string }> {
  const normalized = normalizePhone(phone);

  // Atomic: increment attempts and return row in one query (prevents race conditions)
  const otpResult = await query<{
    id: string;
    code: string;
    attempts: number;
  }>(
    `UPDATE otp_codes
     SET attempts = attempts + 1
     WHERE id = (
       SELECT id FROM otp_codes
       WHERE phone = $1 AND purpose = 'login' AND used = FALSE AND expires_at > NOW() AND attempts < $2
       ORDER BY created_at DESC LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, code, attempts`,
    [normalized, OTP_MAX_ATTEMPTS],
  );

  if (otpResult.rows.length === 0) {
    return { success: false, error: 'Код истёк или не найден. Запросите новый код.' };
  }

  const otp = otpResult.rows[0];

  // Compare code
  if (otp.code !== code) {
    const remaining = OTP_MAX_ATTEMPTS - otp.attempts;
    return {
      success: false,
      error: remaining > 0
        ? `Неверный код. Осталось попыток: ${remaining}`
        : 'Неверный код. Запросите новый.',
    };
  }

  // Mark OTP as used (code matched)
  await query(`UPDATE otp_codes SET used = TRUE WHERE id = $1`, [otp.id]);

  // Find or create user
  const existingUser = await query<Record<string, unknown>>(
    `SELECT * FROM users WHERE phone = $1`,
    [normalized],
  );

  let user: User;
  let isNewUser = false;

  if (existingUser.rows.length > 0) {
    // Update login stats
    await query(
      `UPDATE users SET last_login_at = NOW(), login_count = login_count + 1 WHERE phone = $1`,
      [normalized],
    );
    const row = existingUser.rows[0];
    user = mapUserRow(row);
  } else {
    // Create new user
    const userId = randomUUID();
    const userName = name || 'Пользователь';
    await query(
      `INSERT INTO users (id, name, phone, last_login_at, login_count)
       VALUES ($1, $2, $3, NOW(), 1)`,
      [userId, userName, normalized],
    );
    user = {
      id: userId,
      createdAt: new Date().toISOString(),
      name: userName,
      phone: normalized,
      email: null,
      emailVerified: false,
      companyName: null,
      companyInn: null,
      lastLoginAt: new Date().toISOString(),
      loginCount: 1,
    };
    isNewUser = true;
  }

  return { success: true, user, isNewUser };
}

// ─── Sessions ───────────────────────────────────────────────────────

/** Create a new user session and set cookie */
export async function createUserSession(
  userId: string,
  ip?: string,
  userAgent?: string,
): Promise<string> {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await query(
    `INSERT INTO user_sessions (id, user_id, expires_at, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [sessionId, userId, expiresAt.toISOString(), ip || null, userAgent || null],
  );

  return sessionId;
}

/** Set session cookie on response */
export function setSessionCookie(sessionId: string): { name: string; value: string; options: Record<string, unknown> } {
  return {
    name: USER_SESSION_COOKIE,
    value: sessionId,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    },
  };
}

/** Get user by session token. Returns null if session invalid/expired. */
export async function getUserBySession(sessionToken: string): Promise<User | null> {
  const result = await query<Record<string, unknown>>(
    `SELECT u.*, s.expires_at as session_expires_at, s.created_at as session_created_at
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > NOW()`,
    [sessionToken],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Renew session if needed (throttled)
  const sessionCreated = new Date(row.session_created_at as string).getTime();
  const now = Date.now();
  // Check last renewal by comparing expires_at to what it would be if freshly renewed
  const currentExpiry = new Date(row.session_expires_at as string).getTime();
  const freshExpiry = now + SESSION_DURATION_MS;
  if (freshExpiry - currentExpiry > SESSION_RENEWAL_THRESHOLD_MS) {
    // Renew in background (don't block response)
    query(
      `UPDATE user_sessions SET expires_at = $1 WHERE id = $2`,
      [new Date(freshExpiry).toISOString(), sessionToken],
    ).catch(() => { /* ignore renewal errors */ });
  }

  return mapUserRow(row);
}

/** Get current user from cookies (for Server Components and API routes) */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(USER_SESSION_COOKIE)?.value;
  if (!sessionToken) return null;
  return getUserBySession(sessionToken);
}

/** Validate session token exists and is not expired (lightweight check for proxy) */
export async function isValidUserSession(sessionToken: string): Promise<boolean> {
  const result = await query<{ id: string }>(
    `SELECT id FROM user_sessions WHERE id = $1 AND expires_at > NOW()`,
    [sessionToken],
  );
  return result.rows.length > 0;
}

/** Delete a user session */
export async function deleteUserSession(sessionToken: string): Promise<void> {
  await query(`DELETE FROM user_sessions WHERE id = $1`, [sessionToken]);
}

/** Cleanup expired sessions and OTP codes (run periodically) */
export async function cleanupExpired(): Promise<void> {
  await query(`DELETE FROM user_sessions WHERE expires_at < NOW()`);
  await query(`DELETE FROM otp_codes WHERE expires_at < NOW()`);
}

// ─── Helpers ────────────────────────────────────────────────────────

export const USER_SESSION_COOKIE_NAME = USER_SESSION_COOKIE;

function mapUserRow(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    createdAt: (row.created_at as Date | string)?.toString() || '',
    name: row.name as string,
    phone: row.phone as string,
    email: (row.email as string) || null,
    emailVerified: (row.email_verified as boolean) || false,
    companyName: (row.company_name as string) || null,
    companyInn: (row.company_inn as string) || null,
    lastLoginAt: row.last_login_at ? (row.last_login_at as Date | string).toString() : null,
    loginCount: (row.login_count as number) || 0,
  };
}
