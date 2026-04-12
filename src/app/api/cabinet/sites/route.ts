import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { ensureSchema } from '@/lib/db';
import { getUserSites, addUserSite, extractDomain, updateSiteCheck } from '@/lib/user-storage';
import { analyzeUrl } from '@/checks/engine';

// GET /api/cabinet/sites — list user's sites
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureSchema();
  const sites = await getUserSites(user.id);
  return NextResponse.json({ sites });
}

// POST /api/cabinet/sites — add a new site and run initial check
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url || url.length < 3 || url.length > 2000) {
    return NextResponse.json({ error: 'Укажите URL сайта' }, { status: 400 });
  }

  await ensureSchema();

  const domain = extractDomain(url);
  const site = await addUserSite(user.id, domain);

  // Run check in background — don't block response
  const fullUrl = url.includes('://') ? url : `https://${url}`;
  analyzeUrl(fullUrl)
    .then(result => updateSiteCheck(user.id, domain, result))
    .catch(err => console.error(`[CABINET] Check failed for ${domain}:`, err));

  return NextResponse.json({ success: true, site, domain });
}
