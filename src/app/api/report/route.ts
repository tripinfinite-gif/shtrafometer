import { NextRequest, NextResponse } from 'next/server';
import { analyzeUrl } from '@/checks/engine';
import { generateReport, type ReportMode } from '@/lib/pdf-report';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, mode = 'outbound', visibleCount, companyName, contactEmail, contactPhone } = body as {
      url: string;
      mode?: ReportMode;
      visibleCount?: number;
      companyName?: string;
      contactEmail?: string;
      contactPhone?: string;
    };

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Укажите URL сайта' },
        { status: 400 },
      );
    }

    // Run the check
    const checkResult = await analyzeUrl(url.trim());

    // Generate PDF
    const pdfBuffer = await generateReport(checkResult, {
      mode,
      visibleCount,
      companyName,
      contactEmail,
      contactPhone,
    });

    // Extract domain for filename
    const domain = new URL(checkResult.url).hostname.replace(/^www\./, '');
    const filename = `report-${domain}-${Date.now()}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('загрузить') ||
      error.message.includes('fetch') ||
      error.message.includes('abort')
    )) {
      return NextResponse.json(
        { error: 'Не удалось загрузить сайт. Проверьте URL и попробуйте снова.' },
        { status: 422 },
      );
    }
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Ошибка генерации отчёта' },
      { status: 500 },
    );
  }
}
