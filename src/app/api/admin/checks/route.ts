import { NextRequest, NextResponse } from 'next/server';
import { getCheckLogs, getCheckLogsStats } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const domain = searchParams.get('domain') || undefined;
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);
    const offset = Number(searchParams.get('offset')) || 0;

    const [{ logs, total }, stats] = await Promise.all([
      getCheckLogs({ domain, limit, offset }),
      getCheckLogsStats(),
    ]);

    return NextResponse.json({ logs, total, stats });
  } catch {
    return NextResponse.json(
      { error: 'Ошибка при загрузке логов проверок' },
      { status: 500 }
    );
  }
}
