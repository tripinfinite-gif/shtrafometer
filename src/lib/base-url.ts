import type { NextRequest } from 'next/server';

/**
 * Returns the public base URL for building absolute redirect targets.
 *
 * Inside Docker, `request.url` resolves to `http://0.0.0.0:3000/...` because
 * Next.js binds to HOSTNAME=0.0.0.0. Building redirects from that would send
 * the browser to the internal container address (ERR_SSL_PROTOCOL_ERROR).
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_BASE_URL (canonical, configured in env)
 *  2. X-Forwarded-Proto + X-Forwarded-Host (Traefik passes these)
 *  3. Host header
 *  4. Fallback: https://shtrafometer.ru
 */
export function getPublicBaseUrl(request: NextRequest): string {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, '');

  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host');

  if (host && !host.startsWith('0.0.0.0') && !host.startsWith('localhost')) {
    return `${proto}://${host}`;
  }

  return 'https://shtrafometer.ru';
}

/** Build an absolute URL on the public origin from a path or relative URL. */
export function publicUrl(request: NextRequest, pathOrUrl: string): URL {
  return new URL(pathOrUrl, getPublicBaseUrl(request));
}
