import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import { getAnnotations } from '@/lib/ads/decisions';

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    await ensureSchema();

    const sp = request.nextUrl.searchParams;
    const from = sp.get('from');
    const to = sp.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'from and to query params are required (ISO date)' },
        { status: 400 },
      );
    }

    const channelId = sp.get('channelId') ?? undefined;
    const annotations = await getAnnotations(from, to, channelId);

    return NextResponse.json({ annotations });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
