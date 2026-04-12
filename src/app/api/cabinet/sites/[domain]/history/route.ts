import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { getCheckHistory } from '@/lib/user-storage';

// GET /api/cabinet/sites/[domain]/history — check history with trends
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { domain } = await params;
  const decodedDomain = decodeURIComponent(domain);

  const history = await getCheckHistory(user.id, decodedDomain);

  return NextResponse.json({ history });
}
