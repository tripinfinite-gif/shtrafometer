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

// ─── Check History ──────────────────────────────────────────────────

export interface CheckHistoryEntry {
  id: string;
  domain: string;
  checkedAt: string;
  violations: number;
  warnings: number;
  passed: number;
  totalMaxFine: number;
  complianceScore: number;
  newViolations: number;
  fixedViolations: number;
  recurringViolations: number;
}

/** Save check to history with diff vs previous */
export async function saveCheckHistory(
  userId: string,
  domain: string,
  checkResult: CheckResponse,
): Promise<CheckHistoryEntry> {
  const id = randomUUID();

  // Get previous check for diff
  const prev = await query<Record<string, unknown>>(
    `SELECT check_result FROM check_history
     WHERE user_id = $1 AND domain = $2
     ORDER BY checked_at DESC LIMIT 1`,
    [userId, domain],
  );

  let newViolations = 0;
  let fixedViolations = 0;
  let recurringViolations = 0;

  if (prev.rows.length > 0) {
    const prevResult = prev.rows[0].check_result as CheckResponse | null;
    if (prevResult?.violations) {
      const prevIds = new Set(prevResult.violations.map((v: { id: string }) => v.id));
      const currIds = new Set(checkResult.violations.map(v => v.id));
      newViolations = checkResult.violations.filter(v => !prevIds.has(v.id)).length;
      fixedViolations = prevResult.violations.filter((v: { id: string }) => !currIds.has(v.id)).length;
      recurringViolations = checkResult.violations.filter(v => prevIds.has(v.id)).length;
    }
  } else {
    newViolations = checkResult.violations.length;
  }

  const score = checkResult.complianceScore ?? 100;

  await query(
    `INSERT INTO check_history (id, user_id, domain, violations, warnings, passed, total_max_fine, compliance_score, check_result, new_violations, fixed_violations, recurring_violations)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [id, userId, domain, checkResult.stats.violations, checkResult.stats.warnings, checkResult.stats.passed,
     checkResult.totalMaxFine, score, JSON.stringify(checkResult), newViolations, fixedViolations, recurringViolations],
  );

  return { id, domain, checkedAt: new Date().toISOString(), violations: checkResult.stats.violations,
    warnings: checkResult.stats.warnings, passed: checkResult.stats.passed, totalMaxFine: checkResult.totalMaxFine,
    complianceScore: score, newViolations, fixedViolations, recurringViolations };
}

/** Get check history for a domain */
export async function getCheckHistory(userId: string, domain: string, limit = 12): Promise<CheckHistoryEntry[]> {
  const result = await query<Record<string, unknown>>(
    `SELECT id, domain, checked_at, violations, warnings, passed, total_max_fine, compliance_score,
            new_violations, fixed_violations, recurring_violations
     FROM check_history WHERE user_id = $1 AND domain = $2
     ORDER BY checked_at DESC LIMIT $3`,
    [userId, domain, limit],
  );
  return result.rows.map(row => ({
    id: row.id as string, domain: row.domain as string,
    checkedAt: (row.checked_at as Date | string).toString(),
    violations: (row.violations as number) || 0, warnings: (row.warnings as number) || 0,
    passed: (row.passed as number) || 0, totalMaxFine: (row.total_max_fine as number) || 0,
    complianceScore: (row.compliance_score as number) || 0,
    newViolations: (row.new_violations as number) || 0,
    fixedViolations: (row.fixed_violations as number) || 0,
    recurringViolations: (row.recurring_violations as number) || 0,
  }));
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
