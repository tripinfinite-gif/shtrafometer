import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, verifySession } from '@/lib/auth';
import { analyzeUrl } from '@/checks/engine';
import { generateReport } from '@/lib/pdf-report';

/**
 * POST /api/admin/reports — batch generate outbound PDF reports
 *
 * Body: { urls: string[], visibleCount?: number, contactEmail?: string, contactPhone?: string }
 * Returns: JSON with results per URL (success → base64 PDF, fail → error)
 */
export async function POST(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { urls, visibleCount, contactEmail, contactPhone } = body as {
      urls: string[];
      visibleCount?: number;
      contactEmail?: string;
      contactPhone?: string;
    };

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'Укажите массив URL для проверки' },
        { status: 400 },
      );
    }

    if (urls.length > 50) {
      return NextResponse.json(
        { error: 'Максимум 50 URL за один запрос' },
        { status: 400 },
      );
    }

    const results: Array<{
      url: string;
      domain: string;
      violations: number;
      totalMinFine: number;
      totalMaxFine: number;
      riskLevel: string;
      pdf?: string; // base64
      error?: string;
    }> = [];

    for (const url of urls) {
      try {
        const checkResult = await analyzeUrl(url.trim());
        const domain = new URL(checkResult.url).hostname.replace(/^www\./, '');

        const pdfBuffer = await generateReport(checkResult, {
          mode: 'outbound',
          visibleCount,
          companyName: domain,
          contactEmail,
          contactPhone,
        });

        results.push({
          url: checkResult.url,
          domain,
          violations: checkResult.stats.violations,
          totalMinFine: checkResult.totalMinFine,
          totalMaxFine: checkResult.totalMaxFine,
          riskLevel: checkResult.riskLevel,
          pdf: pdfBuffer.toString('base64'),
        });
      } catch (err) {
        results.push({
          url,
          domain: url,
          violations: 0,
          totalMinFine: 0,
          totalMaxFine: 0,
          riskLevel: 'unknown',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      total: urls.length,
      success: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length,
      results,
    });
  } catch {
    return NextResponse.json(
      { error: 'Ошибка генерации отчётов' },
      { status: 500 },
    );
  }
}
