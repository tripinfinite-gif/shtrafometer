import { randomUUID } from 'crypto';
import { query } from './db';
import type { UserSite } from './types';
import type { CheckResponse } from '@/checks/types';

// ─── User Sites ─────────────────────────────────────────────────────

export async function getUserSites(userId: string): Promise<UserSite[]> {
  const result = await query<Record<string, unknown>>(
    `SELECT * FROM user_sites WHERE user_id = $1 ORDER BY last_check_at DESC NULLS LAST`,
    [userId],
  );
  return result.rows.map(mapUserSiteRow);
}

export async function getUserSite(userId: string, domain: string): Promise<UserSite | null> {
  const result = await query<Record<string, unknown>>(
    `SELECT * FROM user_sites WHERE user_id = $1 AND domain = $2`,
    [userId, domain],
  );
  return result.rows.length > 0 ? mapUserSiteRow(result.rows[0]) : null;
}

export async function addUserSite(userId: string, domain: string): Promise<UserSite> {
  const id = randomUUID();
  await query(
    `INSERT INTO user_sites (id, user_id, domain)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, domain) DO NOTHING`,
    [id, userId, domain],
  );

  // Return the existing or new record
  const site = await getUserSite(userId, domain);
  return site!;
}

export async function updateSiteCheck(
  userId: string,
  domain: string,
  checkResult: CheckResponse,
): Promise<void> {
  await query(
    `UPDATE user_sites
     SET last_check_at = NOW(),
         last_violations = $1,
         last_max_fine = $2,
         last_check_result = $3
     WHERE user_id = $4 AND domain = $5`,
    [
      checkResult.stats.violations,
      checkResult.totalMaxFine,
      JSON.stringify(checkResult),
      userId,
      domain,
    ],
  );
}

/** Extract domain from URL */
export function extractDomain(url: string): string {
  try {
    let cleaned = url.trim();
    if (!/^https?:\/\//i.test(cleaned)) cleaned = 'https://' + cleaned;
    const hostname = new URL(cleaned).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function mapUserSiteRow(row: Record<string, unknown>): UserSite {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    domain: row.domain as string,
    addedAt: (row.added_at as Date | string)?.toString() || '',
    lastCheckAt: row.last_check_at ? (row.last_check_at as Date | string).toString() : null,
    lastViolations: (row.last_violations as number) || 0,
    lastMaxFine: (row.last_max_fine as number) || 0,
    lastCheckResult: (row.last_check_result as CheckResponse) || null,
    monitoringEnabled: (row.monitoring_enabled as boolean) || false,
  };
}
