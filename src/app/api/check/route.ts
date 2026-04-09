import { NextRequest, NextResponse } from 'next/server';
import { analyzeUrl } from '@/checks/engine';
import { saveCheckLog } from '@/lib/storage';

export async function POST(request: NextRequest) {
  const start = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '';
  const userAgent = request.headers.get('user-agent') || '';

  let trimmed = '';

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Укажите URL сайта для проверки' },
        { status: 400 }
      );
    }

    trimmed = url.trim();
    if (trimmed.length < 3 || trimmed.length > 2000) {
      return NextResponse.json(
        { error: 'Некорректный URL' },
        { status: 400 }
      );
    }

    const result = await analyzeUrl(trimmed);
    const durationMs = Date.now() - start;

    // Save check log (fire-and-forget)
    saveCheckLog({
      url: trimmed,
      ip,
      userAgent,
      violations: result.stats.violations,
      warnings: result.stats.warnings,
      totalMaxFine: result.totalMaxFine,
      siteType: result.siteType,
      riskLevel: result.riskLevel,
      success: true,
      durationMs,
    }).catch((err) => console.error('[CHECK_LOG] save error:', err));

    return NextResponse.json(result);
  } catch (error) {
    const durationMs = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    if (trimmed) {
      saveCheckLog({
        url: trimmed,
        ip,
        userAgent,
        violations: 0,
        warnings: 0,
        totalMaxFine: 0,
        siteType: 'unknown',
        riskLevel: 'low',
        success: false,
        error: errorMsg,
        durationMs,
      }).catch((err) => console.error('[CHECK_LOG] save error:', err));
    }

    if (error instanceof Error) {
      if (
        error.message.includes('загрузить') ||
        error.message.includes('fetch') ||
        error.message.includes('abort')
      ) {
        return NextResponse.json(
          { error: 'Не удалось загрузить сайт. Проверьте URL и попробуйте снова.' },
          { status: 422 }
        );
      }
    }
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
