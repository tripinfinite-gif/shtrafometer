import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { getUserSite, addUserSite, updateSiteCheck, saveCheckHistory, extractDomain } from '@/lib/user-storage';
import type { CheckResponse } from '@/checks/types';

/**
 * POST /api/cabinet/sites/[domain]/attach-result
 *
 * Attaches an already-computed check result (produced by the public /api/check
 * endpoint before the user registered) to the authenticated user's site.
 *
 * This avoids re-running the analysis when the browser already has a fresh
 * result in localStorage from a pre-registration site check.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { domain } = await params;
  const pathDomain = extractDomain(decodeURIComponent(domain));
  if (!pathDomain || !/^[a-zа-я0-9.-]+\.[a-zа-я]{2,}$/i.test(pathDomain)) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
  }

  let body: { result?: CheckResponse };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = body.result;
  if (!result || typeof result !== 'object' || !result.url || !result.stats || !Array.isArray(result.violations)) {
    return NextResponse.json({ error: 'Invalid check result' }, { status: 400 });
  }

  // Ensure the result domain matches the URL path (stop tampering across sites)
  const resultDomain = extractDomain(result.url);
  if (resultDomain !== pathDomain) {
    return NextResponse.json({ error: 'Domain mismatch' }, { status: 400 });
  }

  // Idempotent: ensure site exists, then attach result
  let site = await getUserSite(user.id, pathDomain);
  if (!site) site = await addUserSite(user.id, pathDomain);

  await updateSiteCheck(user.id, pathDomain, result);
  const history = await saveCheckHistory(user.id, pathDomain, result);

  return NextResponse.json({ success: true, history });
}
