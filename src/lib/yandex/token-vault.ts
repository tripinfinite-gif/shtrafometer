/**
 * Yandex OAuth token vault — pgcrypto-encrypted storage.
 *
 * Phase 3D — docs/plan-ai-consultant.md (R4: утечка OAuth-токенов).
 *
 * Шифрование происходит прямо в SQL через `pgp_sym_encrypt`/`pgp_sym_decrypt`
 * (pgcrypto extension подключён в `ensureSchema`). Ключ шифрования
 * (`AI_TOKEN_ENCRYPTION_KEY`) никогда не покидает серверный env — access/refresh
 * токены в открытом виде не логируются и не хранятся в колонках.
 *
 * Никогда не логируй возвращаемый `accessToken`/`refreshToken` в консоль.
 */

import { query } from '@/lib/db';
import { getOAuthEnv } from '@/lib/env';

// ─── Types ────────────────────────────────────────────────────────

export type OAuthProvider = 'yandex-direct' | 'yandex-metrika' | 'yandex-webmaster';

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = [
  'yandex-direct',
  'yandex-metrika',
  'yandex-webmaster',
] as const;

export interface StoredToken {
  id: string;
  userId: string;
  provider: OAuthProvider;
  accessToken: string; // decrypted in-memory
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
  clientLogin: string | null;
}

export interface ConnectionStatus {
  provider: OAuthProvider;
  connected: boolean;
  expiresAt: Date | null;
  scope: string | null;
}

export interface SaveTokenInput {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string | null;
  clientLogin?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────

function getKey(): string {
  return getOAuthEnv().AI_TOKEN_ENCRYPTION_KEY;
}

function isValidProvider(p: string): p is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(p);
}

// ─── Public API ───────────────────────────────────────────────────

/** Сохранить / перезаписать токен (UPSERT по (user_id, provider)). */
export async function saveToken(
  userId: string,
  provider: OAuthProvider,
  data: SaveTokenInput,
): Promise<void> {
  const key = getKey();
  await query(
    `INSERT INTO ai_client_oauth_tokens
       (user_id, provider, access_token_encrypted, refresh_token_encrypted,
        expires_at, scope, client_login, last_used_at)
     VALUES (
       $1, $2,
       pgp_sym_encrypt($3, $4),
       CASE WHEN $5::text IS NULL THEN NULL ELSE pgp_sym_encrypt($5, $4) END,
       $6, $7, $8, NOW()
     )
     ON CONFLICT (user_id, provider) DO UPDATE SET
       access_token_encrypted  = EXCLUDED.access_token_encrypted,
       refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
       expires_at              = EXCLUDED.expires_at,
       scope                   = EXCLUDED.scope,
       client_login            = EXCLUDED.client_login,
       last_used_at            = NOW()`,
    [
      userId,
      provider,
      data.accessToken,
      key,
      data.refreshToken ?? null,
      data.expiresAt ?? null,
      data.scope ?? null,
      data.clientLogin ?? null,
    ],
  );
}

/** Получить расшифрованный токен. Возвращает `null`, если не подключён. */
export async function getToken(
  userId: string,
  provider: OAuthProvider,
): Promise<StoredToken | null> {
  const key = getKey();
  const { rows } = await query<{
    id: string;
    user_id: string;
    provider: string;
    access_token: string;
    refresh_token: string | null;
    expires_at: Date | null;
    scope: string | null;
    client_login: string | null;
  }>(
    `SELECT
       id,
       user_id,
       provider,
       pgp_sym_decrypt(access_token_encrypted, $3)::text AS access_token,
       CASE WHEN refresh_token_encrypted IS NULL THEN NULL
            ELSE pgp_sym_decrypt(refresh_token_encrypted, $3)::text END AS refresh_token,
       expires_at,
       scope,
       client_login
     FROM ai_client_oauth_tokens
     WHERE user_id = $1 AND provider = $2
     LIMIT 1`,
    [userId, provider, key],
  );
  const row = rows[0];
  if (!row) return null;
  if (!isValidProvider(row.provider)) return null;

  // Обновим last_used_at (best-effort, не блокируем основной путь)
  void query(
    `UPDATE ai_client_oauth_tokens SET last_used_at = NOW() WHERE id = $1`,
    [row.id],
  ).catch(() => {
    /* ignore */
  });

  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: row.expires_at,
    scope: row.scope,
    clientLogin: row.client_login,
  };
}

/** Удалить токен (отключение провайдера). Идемпотентно. */
export async function deleteToken(userId: string, provider: OAuthProvider): Promise<void> {
  await query(
    `DELETE FROM ai_client_oauth_tokens WHERE user_id = $1 AND provider = $2`,
    [userId, provider],
  );
}

/** Сводка подключений по всем провайдерам (для UI). Не раскрывает токены. */
export async function listConnections(userId: string): Promise<ConnectionStatus[]> {
  const { rows } = await query<{
    provider: string;
    expires_at: Date | null;
    scope: string | null;
  }>(
    `SELECT provider, expires_at, scope
       FROM ai_client_oauth_tokens
       WHERE user_id = $1`,
    [userId],
  );

  const byProvider = new Map<OAuthProvider, { expiresAt: Date | null; scope: string | null }>();
  for (const r of rows) {
    if (isValidProvider(r.provider)) {
      byProvider.set(r.provider, { expiresAt: r.expires_at, scope: r.scope });
    }
  }

  return OAUTH_PROVIDERS.map((provider) => {
    const hit = byProvider.get(provider);
    return {
      provider,
      connected: !!hit,
      expiresAt: hit?.expiresAt ?? null,
      scope: hit?.scope ?? null,
    };
  });
}
