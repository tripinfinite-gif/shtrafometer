import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { listConversations } from '@/lib/ai/storage';
import { ensureSchema } from '@/lib/db';

// Admin-guard также висит на уровне proxy.ts (/admin/:path*, /api/admin/:path*),
// но дублируем в route — на случай прямого запроса в API в dev-окружении.

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    await ensureSchema();
    const conversations = await listConversations('admin');
    return NextResponse.json({ conversations });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg, conversations: [] }, { status: 500 });
  }
}
