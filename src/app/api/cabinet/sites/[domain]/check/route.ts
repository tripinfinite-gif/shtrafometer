import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { getUserSite, addUserSite, updateSiteCheck, saveCheckHistory } from '@/lib/user-storage';
import { analyzeUrl } from '@/checks/engine';

// POST /api/cabinet/sites/[domain]/check — run check and save to history
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { domain } = await params;
  const decodedDomain = decodeURIComponent(domain);

  // Ensure site exists
  let site = await getUserSite(user.id, decodedDomain);
  if (!site) {
    site = await addUserSite(user.id, decodedDomain);
  }

  try {
    const result = await analyzeUrl(`https://${decodedDomain}`);

    // Update site with latest check
    await updateSiteCheck(user.id, decodedDomain, result);

    // Save to check history (with diff vs previous)
    const historyEntry = await saveCheckHistory(user.id, decodedDomain, result);

    return NextResponse.json({ success: true, result, history: historyEntry });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка проверки';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
