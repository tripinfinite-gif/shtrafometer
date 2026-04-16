import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import { getDecisionById } from '@/lib/ads/decisions';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    await ensureSchema();

    const { id } = await params;
    const decision = await getDecisionById(id);

    if (!decision) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    return NextResponse.json({ decision });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
