import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'path';
import type { CheckResponse, Violation } from '@/checks/types';

// ─── Types ─────────────────────────────────────────────────────────

export type ReportMode = 'outbound' | 'full';

export interface ReportOptions {
  /** 'outbound' = partial (for cold emails), 'full' = paid complete report */
  mode: ReportMode;
  /** How many violations to show in detail (outbound only, default 3) */
  visibleCount?: number;
  /** Company name for branding the report header */
  companyName?: string;
  /** Contact email shown in footer CTA */
  contactEmail?: string;
  /** Contact phone shown in footer CTA */
  contactPhone?: string;
}

const DEFAULT_VISIBLE_COUNT = 3;
const BRAND_NAME = 'Штрафометр';
const BRAND_URL = 'https://shtrafometer.vercel.app';
const LEGAL_NAME = 'ООО «Инфологистик 24»';
const LEGAL_INN = 'ИНН 9701049890';
const LEGAL_OGRN = 'ОГРН 1167746879486';
const DIRECTOR_NAME = 'А.В. Смирнов';

// ─── Colors (matching site theme) ──────────────────────────────────

const C = {
  primary: '#6C5CE7',
  primaryDark: '#5A4BD1',
  primaryLight: '#EDE9FE',

  black: '#0D0F12',
  gray900: '#212529',
  gray800: '#343A40',
  gray700: '#343A40',
  gray500: '#495057',
  gray400: '#868E96',
  gray300: '#CED4DA',
  gray200: '#DEE2E6',
  gray100: '#F1F3F5',
  gray50: '#F8F9FA',
  white: '#FFFFFF',

  critical: '#E03131',
  high: '#E8590C',
  medium: '#F08C00',
  low: '#2F9E44',

  hidden: '#CED4DA',
  stamp: '#6C5CE7',
} as const;

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'КРИТИЧЕСКИЙ',
  high: 'ВЫСОКИЙ',
  medium: 'СРЕДНИЙ',
  low: 'НИЗКИЙ',
};

const RISK_LABELS: Record<string, string> = {
  critical: 'КРИТИЧЕСКИЙ',
  high: 'ВЫСОКИЙ',
  medium: 'СРЕДНИЙ',
  low: 'НИЗКИЙ',
};

// ─── Helpers ───────────────────────────────────────────────────────

function formatFine(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} млн руб.`;
  }
  return amount.toLocaleString('ru-RU') + ' руб.';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU');
}

function severityColor(severity: string): string {
  return C[severity as keyof typeof C] || C.medium;
}

function generateReportNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `${y}${m}${d}-${seq}`;
}

function getFontsDir(): string {
  return path.join(process.cwd(), 'public', 'fonts');
}

// ─── QR Code generation ────────────────────────────────────────────

async function generateQRBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    width: 100,
    margin: 1,
    color: { dark: C.primary, light: '#FFFFFF00' },
    errorCorrectionLevel: 'M',
  });
}

// ─── Stamp (company seal) ──────────────────────────────────────────

function drawStamp(doc: PDFKit.PDFDocument, cx: number, cy: number, radius: number) {
  doc.save();
  doc.opacity(0.65);

  // Outer circle (double ring)
  doc.circle(cx, cy, radius).lineWidth(2.5).strokeColor(C.stamp).stroke();
  doc.circle(cx, cy, radius - 5).lineWidth(1).strokeColor(C.stamp).stroke();

  // Inner circle
  doc.circle(cx, cy, radius - 22).lineWidth(1).strokeColor(C.stamp).stroke();

  // Center star
  drawStar(doc, cx, cy, 10, 5, 5);

  // Text around the circle — top arc: company name
  drawTextOnArc(doc, LEGAL_NAME, cx, cy, radius - 13, -Math.PI * 0.75, Math.PI * 0.75, 7);

  // Text around the circle — bottom arc: INN + OGRN
  drawTextOnArcBottom(doc, `${LEGAL_INN} * ${LEGAL_OGRN}`, cx, cy, radius - 13, Math.PI * 1.25, Math.PI * 0.75, 5.5);

  doc.restore();
}

function drawStar(doc: PDFKit.PDFDocument, cx: number, cy: number, outerR: number, innerR: number, points: number) {
  doc.save();
  doc.fillColor(C.stamp);

  const step = Math.PI / points;
  doc.moveTo(cx + outerR * Math.sin(0), cy - outerR * Math.cos(0));

  for (let i = 1; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step;
    doc.lineTo(cx + r * Math.sin(angle), cy - r * Math.cos(angle));
  }

  doc.closePath().fill();
  doc.restore();
}

function drawTextOnArc(
  doc: PDFKit.PDFDocument,
  text: string,
  cx: number, cy: number,
  radius: number,
  startAngle: number, endAngle: number,
  fontSize: number,
) {
  doc.save();
  doc.fontSize(fontSize).fillColor(C.stamp);

  const chars = text.split('');
  const totalAngle = endAngle - startAngle;
  const angleStep = totalAngle / (chars.length + 1);

  for (let i = 0; i < chars.length; i++) {
    const angle = startAngle + angleStep * (i + 1) - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    doc.save();
    doc.translate(x, y);
    doc.rotate((angle + Math.PI / 2) * (180 / Math.PI));
    doc.text(chars[i], -fontSize / 4, -fontSize / 2, { width: fontSize, align: 'center' });
    doc.restore();
  }

  doc.restore();
}

function drawTextOnArcBottom(
  doc: PDFKit.PDFDocument,
  text: string,
  cx: number, cy: number,
  radius: number,
  startAngle: number, endAngle: number,
  fontSize: number,
) {
  doc.save();
  doc.fontSize(fontSize).fillColor(C.stamp);

  const chars = text.split('');
  const totalAngle = endAngle - startAngle;
  const angleStep = totalAngle / (chars.length + 1);

  for (let i = 0; i < chars.length; i++) {
    const angle = startAngle + angleStep * (i + 1) - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    doc.save();
    doc.translate(x, y);
    doc.rotate((angle + Math.PI / 2 + Math.PI) * (180 / Math.PI));
    doc.text(chars[i], -fontSize / 4, -fontSize / 2, { width: fontSize, align: 'center' });
    doc.restore();
  }

  doc.restore();
}

// ─── Signature (facsimile) ─────────────────────────────────────────

function drawSignature(doc: PDFKit.PDFDocument, x: number, y: number) {
  doc.save();
  doc.strokeColor(C.primaryDark).lineWidth(1.2).opacity(0.8);

  // Hand-drawn signature path
  doc.moveTo(x, y + 12)
    .bezierCurveTo(x + 8, y - 2, x + 18, y + 18, x + 28, y + 4)
    .bezierCurveTo(x + 35, y - 4, x + 42, y + 14, x + 52, y + 2)
    .bezierCurveTo(x + 58, y - 6, x + 65, y + 10, x + 75, y + 6)
    .bezierCurveTo(x + 82, y + 3, x + 88, y + 12, x + 95, y + 8)
    .stroke();

  // Underline flourish
  doc.moveTo(x + 15, y + 18)
    .bezierCurveTo(x + 35, y + 22, x + 65, y + 16, x + 90, y + 20)
    .stroke();

  doc.restore();
}

// ─── Watermark ─────────────────────────────────────────────────────

function drawWatermark(doc: PDFKit.PDFDocument, font: string) {
  doc.save();
  doc.opacity(0.04);
  doc.translate(297.64, 421);
  doc.rotate(-45);
  doc.font(font).fontSize(60).fillColor(C.primary)
    .text('ШТРАФОМЕТР', -200, -30, { width: 400, align: 'center' });
  doc.restore();
}

// ─── Main generator ────────────────────────────────────────────────

export async function generateReport(
  data: CheckResponse,
  options: ReportOptions,
): Promise<Buffer> {
  const {
    mode,
    visibleCount = DEFAULT_VISIBLE_COUNT,
    companyName,
    contactEmail = 'info@shtrafometer.ru',
    contactPhone,
  } = options;

  const isOutbound = mode === 'outbound';
  const visible = isOutbound
    ? data.violations.slice(0, visibleCount)
    : data.violations;
  const hidden = isOutbound
    ? data.violations.slice(visibleCount)
    : [];

  const reportNumber = generateReportNumber();

  // Generate QR code
  const qrUrl = `${BRAND_URL}/?url=${encodeURIComponent(data.url)}`;
  let qrBuffer: Buffer | null = null;
  try {
    qrBuffer = await generateQRBuffer(qrUrl);
  } catch {
    // QR generation failed — continue without it
  }

  const fontsDir = getFontsDir();
  const fontPathRegular = path.join(fontsDir, 'Inter-Regular.ttf');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      bufferPages: true,
      font: fontPathRegular,
      info: {
        Title: `Отчёт о проверке сайта ${data.url} — ${BRAND_NAME}`,
        Author: LEGAL_NAME,
        Subject: 'Проверка соответствия законодательству РФ',
        Keywords: 'compliance, audit, 152-ФЗ, штрафы',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Register embedded Inter fonts
    doc.registerFont('Inter', fontPathRegular);
    doc.registerFont('InterBold', path.join(fontsDir, 'Inter-Bold.ttf'));
    doc.registerFont('InterSemiBold', path.join(fontsDir, 'Inter-SemiBold.ttf'));

    const font = 'Inter';
    const fontBold = 'InterBold';
    const fontSemi = 'InterSemiBold';

    // ── Watermark on first page (outbound) ───────────────────────

    if (isOutbound) {
      drawWatermark(doc, fontBold);
    }

    // ── Header bar ───────────────────────────────────────────────

    doc.rect(0, 0, 595.28, 80).fill(C.primary);

    // Brand name
    doc.font(fontBold).fontSize(20).fillColor(C.white)
      .text(BRAND_NAME, 50, 18, { width: 300 });
    doc.font(font).fontSize(8).fillColor('#C4B5FD')
      .text('Проверка сайтов на соответствие законодательству РФ', 50, 42, { width: 300 });
    doc.font(font).fontSize(8).fillColor('#C4B5FD')
      .text(BRAND_URL, 50, 54, { width: 300 });

    // Report number + date on the right
    doc.font(fontSemi).fontSize(8).fillColor(C.white)
      .text(`Отчёт № ${reportNumber}`, 380, 22, { width: 170, align: 'right' });
    doc.font(font).fontSize(8).fillColor('#C4B5FD')
      .text(`от ${formatDate(data.checkedAt)}`, 380, 36, { width: 170, align: 'right' });

    // Legal entity
    doc.font(font).fontSize(7).fillColor('#C4B5FD')
      .text(LEGAL_NAME, 380, 54, { width: 170, align: 'right' });

    // ── Title section ────────────────────────────────────────────

    let y = 98;

    doc.fillColor(C.black).font(fontBold).fontSize(15)
      .text('Отчёт о проверке сайта', 50, y);
    y += 22;

    doc.fillColor(C.primary).font(fontSemi).fontSize(12)
      .text(data.url, 50, y);
    y += 18;

    if (companyName) {
      doc.fillColor(C.gray500).font(font).fontSize(9)
        .text(`Организация: ${companyName}`, 50, y);
      y += 16;
    }

    doc.fillColor(C.gray400).font(font).fontSize(8)
      .text(`Тип сайта: ${data.siteType === 'ecommerce' ? 'Интернет-магазин' : data.siteType === 'service' ? 'Сайт услуг' : 'Информационный'}`, 50, y);
    y += 18;

    // ── Risk + Summary box ───────────────────────────────────────

    const riskColor = severityColor(data.riskLevel);
    const boxH = 75;

    // Box background
    doc.roundedRect(50, y, 495.28, boxH, 8).fill(C.gray50);
    // Left accent bar
    doc.rect(50, y, 5, boxH).fill(riskColor);

    // Risk badge
    doc.roundedRect(70, y + 10, 115, 24, 4).fill(riskColor);
    doc.font(fontBold).fontSize(10).fillColor(C.white)
      .text(`Риск: ${RISK_LABELS[data.riskLevel] || data.riskLevel}`, 75, y + 16, { width: 105, align: 'center' });

    // Fine amount
    doc.fillColor(C.black).font(fontBold).fontSize(15)
      .text(`${formatFine(data.totalMinFine)} — ${formatFine(data.totalMaxFine)}`, 200, y + 10, { width: 335 });
    doc.fillColor(C.gray400).font(font).fontSize(8)
      .text('Потенциальная сумма штрафов для юридического лица', 200, y + 30);

    // Stats row
    doc.fillColor(C.gray500).font(fontSemi).fontSize(9);
    doc.text(`Нарушений: ${data.stats.violations}`, 70, y + 52);
    doc.text(`Предупреждений: ${data.stats.warnings}`, 220, y + 52);
    doc.text(`Пройдено: ${data.stats.passed}`, 400, y + 52);

    y += boxH + 16;

    // ── Fines by law ─────────────────────────────────────────────

    doc.fillColor(C.black).font(fontBold).fontSize(12)
      .text('Штрафы по законам', 50, y);
    y += 20;

    const laws = Object.entries(data.finesByLaw)
      .sort(([, a], [, b]) => b.max - a.max);

    for (const [law, info] of laws) {
      if (y > 730) { doc.addPage(); y = 50; if (isOutbound) drawWatermark(doc, fontBold); }

      // Alternating row background
      doc.roundedRect(50, y, 495.28, 22, 3).fill(C.gray50);

      doc.fillColor(C.gray800).font(fontSemi).fontSize(8)
        .text(law, 60, y + 5, { width: 130 });
      doc.fillColor(C.gray400).font(font).fontSize(8)
        .text(`${info.count} наруш.`, 200, y + 5, { width: 80 });
      doc.fillColor(C.critical).font(fontBold).fontSize(8)
        .text(`${formatFine(info.min)} — ${formatFine(info.max)}`, 300, y + 5, { width: 235, align: 'right' });

      y += 26;
    }

    // ── Violations (visible) ─────────────────────────────────────

    y += 10;
    if (y > 680) { doc.addPage(); y = 50; if (isOutbound) drawWatermark(doc, fontBold); }

    doc.fillColor(C.black).font(fontBold).fontSize(12)
      .text(isOutbound ? 'Основные нарушения' : 'Все нарушения', 50, y);
    y += 22;

    for (const v of visible) {
      y = renderViolation(doc, v, y, font, fontBold, fontSemi, false, isOutbound);
    }

    // ── Hidden violations (outbound only) ────────────────────────

    if (isOutbound && hidden.length > 0) {
      if (y > 680) { doc.addPage(); y = 50; drawWatermark(doc, fontBold); }

      y += 8;
      doc.fillColor(C.gray500).font(fontBold).fontSize(11)
        .text(`Ещё ${hidden.length} нарушений скрыто`, 50, y);
      y += 18;

      for (const v of hidden) {
        y = renderViolation(doc, v, y, font, fontBold, fontSemi, true, isOutbound);
      }

      // CTA box with QR
      y += 14;
      if (y > 680) { doc.addPage(); y = 50; drawWatermark(doc, fontBold); }

      const ctaH = 75;
      doc.roundedRect(50, y, 495.28, ctaH, 8).fill(C.primary);

      const textX = qrBuffer ? 70 : 70;
      const textW = qrBuffer ? 340 : 460;

      doc.fillColor(C.white).font(fontBold).fontSize(12)
        .text('Получите полный отчёт с рекомендациями', textX, y + 12, { width: textW });
      doc.fillColor(C.white).font(font).fontSize(9)
        .text(`Свяжитесь с нами: ${contactEmail}${contactPhone ? '  |  ' + contactPhone : ''}`, textX, y + 32, { width: textW });
      doc.fillColor('#C4B5FD').font(font).fontSize(8)
        .text(`Или проверьте сайт самостоятельно: ${BRAND_URL}`, textX, y + 48, { width: textW });

      // QR code
      if (qrBuffer) {
        doc.image(qrBuffer, 455, y + 8, { width: 58, height: 58 });
      }

      y += ctaH + 16;
    }

    // ── Warnings ─────────────────────────────────────────────────

    if (data.warnings.length > 0) {
      if (y > 680) { doc.addPage(); y = 50; if (isOutbound) drawWatermark(doc, fontBold); }

      doc.fillColor(C.black).font(fontBold).fontSize(12)
        .text('Предупреждения', 50, y);
      y += 20;

      for (const w of data.warnings) {
        if (y > 730) { doc.addPage(); y = 50; if (isOutbound) drawWatermark(doc, fontBold); }

        doc.roundedRect(50, y, 495.28, 28, 3)
          .lineWidth(0.5).strokeColor(C.medium).stroke();
        doc.fillColor(C.medium).font(fontSemi).fontSize(7)
          .text(w.law, 60, y + 5, { width: 70 });
        doc.fillColor(C.gray800).font(font).fontSize(8)
          .text(w.title, 140, y + 5, { width: 290 });
        doc.fillColor(C.gray400).font(font).fontSize(7)
          .text(w.potentialFine, 440, y + 5, { width: 95, align: 'right' });
        y += 34;
      }
    }

    // ── Technical SEO Audit ─────────────────────────────────────

    {
      const seoViolations = data.violations.filter(v => v.module === 'seo');
      const seoPassed = data.passed.filter(p => p.module === 'seo');
      const seoWarnings = data.warnings.filter(w => w.id?.startsWith('seo-'));
      const allSeoChecks = [
        ...seoPassed.map(p => ({ id: p.id, title: p.title, status: 'passed' as const })),
        ...seoViolations.map(v => ({ id: v.id, title: v.title, status: 'violation' as const })),
        ...seoWarnings.map(w => ({ id: w.id, title: w.title, status: 'warning' as const })),
      ];

      if (allSeoChecks.length > 0) {
        doc.addPage();
        y = 50;
        if (isOutbound) drawWatermark(doc, fontBold);

        // Section header
        doc.fillColor(C.black).font(fontBold).fontSize(14)
          .text('Технический SEO-аудит', 50, y);
        y += 28;

        // SEO Score
        const rawScore = 100 - seoViolations.length * 7;
        const seoScore = Math.max(0, Math.min(100, rawScore));
        const scoreColor = seoScore >= 80 ? C.low : seoScore >= 50 ? C.medium : C.critical;

        // Score visualization box
        doc.roundedRect(50, y, 495.28, 60, 8).fill(C.gray50);

        doc.fillColor(scoreColor).font(fontBold).fontSize(36)
          .text(String(seoScore), 70, y + 8, { width: 80 });
        doc.fillColor(C.gray500).font(font).fontSize(11)
          .text('из 100 баллов', 70, y + 44, { width: 100 });

        doc.fillColor(C.gray800).font(fontSemi).fontSize(10)
          .text('SEO-оценка сайта', 180, y + 12, { width: 350 });
        doc.fillColor(C.gray400).font(font).fontSize(8)
          .text(
            `Проверено: ${allSeoChecks.length} параметров  |  Проблем: ${seoViolations.length}  |  Предупреждений: ${seoWarnings.length}  |  Пройдено: ${seoPassed.length}`,
            180, y + 28, { width: 350 },
          );

        y += 72;

        // Quick vs complex fix definitions
        const complexFixIds = new Set(['seo-01', 'seo-05', 'seo-06', 'seo-07', 'seo-08']);
        const fixPrices: Record<string, string> = {
          'seo-01': '5 000 — 15 000 руб.',
          'seo-02': '500 — 1 000 руб.',
          'seo-03': '500 — 1 000 руб.',
          'seo-04': '500 — 1 500 руб.',
          'seo-05': '5 000 — 15 000 руб.',
          'seo-06': '5 000 — 15 000 руб.',
          'seo-07': '3 000 — 10 000 руб.',
          'seo-08': '2 000 — 8 000 руб.',
          'seo-09': '200 — 800 руб.',
          'seo-10': '300 — 1 000 руб.',
          'seo-11': '300 — 1 000 руб.',
          'seo-12': '200 — 500 руб.',
          'seo-13': '200 — 500 руб.',
          'seo-14': '500 — 1 500 руб.',
        };

        // Table header
        if (y > 700) { doc.addPage(); y = 50; if (isOutbound) drawWatermark(doc, fontBold); }

        doc.fillColor(C.black).font(fontBold).fontSize(11)
          .text('Результаты проверок', 50, y);
        y += 18;

        // Column headers
        doc.roundedRect(50, y, 495.28, 20, 3).fill(C.primary);
        doc.fillColor(C.white).font(fontSemi).fontSize(7);
        doc.text('Проверка', 60, y + 5, { width: 190 });
        doc.text('Статус', 255, y + 5, { width: 80 });
        doc.text('Сложность', 340, y + 5, { width: 70 });
        doc.text('Цена исправления', 415, y + 5, { width: 120, align: 'right' });
        y += 24;

        // Table rows
        for (const check of allSeoChecks) {
          if (y > 730) { doc.addPage(); y = 50; if (isOutbound) drawWatermark(doc, fontBold); }

          doc.roundedRect(50, y, 495.28, 22, 3).fill(C.gray50);

          // Check name
          doc.fillColor(C.gray800).font(font).fontSize(7.5)
            .text(check.title, 60, y + 5, { width: 190, ellipsis: true });

          // Status
          const statusText = check.status === 'passed' ? '✓ Пройдена'
            : check.status === 'warning' ? '⚠ Предупреждение'
            : '✗ Проблема';
          const statusColor = check.status === 'passed' ? C.low
            : check.status === 'warning' ? C.medium
            : C.critical;
          doc.fillColor(statusColor).font(fontSemi).fontSize(7.5)
            .text(statusText, 255, y + 5, { width: 80 });

          // Complexity
          const isComplex = complexFixIds.has(check.id);
          const complexityText = check.status === 'passed' ? '—' : isComplex ? 'Сложный фикс' : 'Быстрый фикс';
          const complexityColor = check.status === 'passed' ? C.gray300 : isComplex ? C.high : C.low;
          doc.fillColor(complexityColor).font(font).fontSize(7)
            .text(complexityText, 340, y + 5, { width: 70 });

          // Price
          const priceText = check.status === 'passed' ? '—' : (fixPrices[check.id] || '—');
          doc.fillColor(C.gray500).font(font).fontSize(7)
            .text(priceText, 415, y + 5, { width: 120, align: 'right' });

          y += 26;
        }

        // Detailed violation descriptions
        if (seoViolations.length > 0) {
          y += 10;
          if (y > 680) { doc.addPage(); y = 50; if (isOutbound) drawWatermark(doc, fontBold); }

          doc.fillColor(C.black).font(fontBold).fontSize(11)
            .text('Подробности по SEO-проблемам', 50, y);
          y += 18;

          for (const v of seoViolations) {
            if (y > 700) { doc.addPage(); y = 50; if (isOutbound) drawWatermark(doc, fontBold); }

            const isComplex = complexFixIds.has(v.id);

            // Card background
            const descH = 14 + Math.ceil(v.description.length / 90) * 10 + Math.ceil(v.recommendation.length / 90) * 10 + 36;
            if (y + descH > 760) { doc.addPage(); y = 50; if (isOutbound) drawWatermark(doc, fontBold); }

            doc.roundedRect(54, y, 491.28, descH, 6)
              .lineWidth(0.5).strokeColor(C.gray200).stroke();
            doc.rect(50, y, 4, descH).fill(C.critical);

            let iy = y + 8;

            // Title + fix category badge
            doc.fillColor(C.black).font(fontSemi).fontSize(9)
              .text(v.title, 64, iy, { width: 350 });
            const badgeColor = isComplex ? C.high : C.low;
            const badgeText = isComplex ? 'Сложный фикс' : 'Быстрый фикс';
            doc.roundedRect(430, iy - 2, 100, 16, 3).fill(badgeColor);
            doc.fillColor(C.white).font(fontBold).fontSize(7)
              .text(badgeText, 432, iy, { width: 96, align: 'center' });
            iy = doc.y + 6;

            // Description
            doc.fillColor(C.gray500).font(font).fontSize(7.5)
              .text(`Проблема: ${v.description}`, 64, iy, { width: 471 });
            iy = doc.y + 4;

            // Recommendation
            doc.fillColor(C.primary).font(font).fontSize(7.5)
              .text(`Рекомендация: ${v.recommendation}`, 64, iy, { width: 471 });
            iy = doc.y + 4;

            // Price
            const price = fixPrices[v.id] || '—';
            doc.fillColor(C.gray400).font(fontSemi).fontSize(7)
              .text(`Стоимость исправления: ${price}`, 64, iy, { width: 471 });
            iy = doc.y + 4;

            y = iy + 6;
          }
        }

        // Pricing summary table
        y += 8;
        if (y > 650) { doc.addPage(); y = 50; if (isOutbound) drawWatermark(doc, fontBold); }

        doc.fillColor(C.black).font(fontBold).fontSize(11)
          .text('Стоимость SEO-исправлений', 50, y);
        y += 18;

        // Quick fixes summary
        doc.roundedRect(50, y, 495.28, 22, 3).fill(C.gray50);
        doc.fillColor(C.low).font(fontSemi).fontSize(8)
          .text('Быстрые фиксы', 60, y + 5, { width: 150 });
        doc.fillColor(C.gray500).font(font).fontSize(7)
          .text('title, description, h1, alt, canonical, OG, favicon, lang, headings', 180, y + 5, { width: 200 });
        doc.fillColor(C.gray800).font(fontSemi).fontSize(8)
          .text('200 — 1 500 руб.', 415, y + 5, { width: 120, align: 'right' });
        y += 26;

        // Complex fixes summary
        doc.roundedRect(50, y, 495.28, 22, 3).fill(C.gray50);
        doc.fillColor(C.high).font(fontSemi).fontSize(8)
          .text('Сложные фиксы', 60, y + 5, { width: 150 });
        doc.fillColor(C.gray500).font(font).fontSize(7)
          .text('SSL, Core Web Vitals, robots.txt, schema, viewport/mobile', 180, y + 5, { width: 200 });
        doc.fillColor(C.gray800).font(fontSemi).fontSize(8)
          .text('2 000 — 15 000 руб.', 415, y + 5, { width: 120, align: 'right' });
        y += 26;

        // Core Web Vitals additional service
        doc.roundedRect(50, y, 495.28, 22, 3).fill(C.primaryLight);
        doc.fillColor(C.primary).font(fontSemi).fontSize(8)
          .text('Core Web Vitals оптимизация', 60, y + 5, { width: 200 });
        doc.fillColor(C.gray500).font(font).fontSize(7)
          .text('комплексная оптимизация скорости загрузки', 240, y + 5, { width: 170 });
        doc.fillColor(C.primaryDark).font(fontSemi).fontSize(8)
          .text('5 000 — 15 000 руб.', 415, y + 5, { width: 120, align: 'right' });
        y += 30;
      }
    }

    // ── Recommendations (full report only) ───────────────────────

    if (!isOutbound && data.violations.length > 0) {
      doc.addPage();
      y = 50;

      doc.fillColor(C.black).font(fontBold).fontSize(14)
        .text('Рекомендации по устранению', 50, y);
      y += 24;

      for (let i = 0; i < data.violations.length; i++) {
        const v = data.violations[i];
        if (y > 710) { doc.addPage(); y = 50; }

        doc.fillColor(C.primary).font(fontBold).fontSize(9)
          .text(`${i + 1}. ${v.title}`, 50, y, { width: 495 });
        y = doc.y + 4;

        doc.fillColor(C.gray500).font(font).fontSize(8)
          .text(v.recommendation, 65, y, { width: 480 });
        y = doc.y + 10;
      }

      // QR code at the end of recommendations
      if (qrBuffer) {
        if (y > 650) { doc.addPage(); y = 50; }
        y += 10;
        doc.image(qrBuffer, 50, y, { width: 70, height: 70 });
        doc.fillColor(C.gray500).font(font).fontSize(8)
          .text('Проверьте сайт самостоятельно', 130, y + 15, { width: 200 });
        doc.fillColor(C.primary).font(fontSemi).fontSize(8)
          .text(BRAND_URL, 130, y + 28, { width: 200 });
        y += 80;
      }
    }

    // ── Signature block + Stamp (last page) ──────────────────────

    // Make sure we have enough space
    if (y > 620) { doc.addPage(); y = 50; if (isOutbound) drawWatermark(doc, fontBold); }

    y += 20;

    // Separator line
    doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor(C.gray200).stroke();
    y += 16;

    // Legal info
    doc.fillColor(C.gray400).font(font).fontSize(7)
      .text(`${LEGAL_NAME}  |  ${LEGAL_INN}  |  ${LEGAL_OGRN}`, 50, y, { width: 495 });
    y += 14;

    doc.fillColor(C.gray800).font(font).fontSize(8)
      .text(`Дата формирования отчёта: ${formatDateShort(data.checkedAt)}`, 50, y);
    doc.fillColor(C.gray800).font(font).fontSize(8)
      .text(`Отчёт № ${reportNumber}`, 350, y, { width: 195, align: 'right' });
    y += 20;

    // Signature block
    doc.fillColor(C.gray800).font(font).fontSize(8)
      .text('Генеральный директор', 50, y);

    // Signature line
    doc.moveTo(190, y + 10).lineTo(350, y + 10).lineWidth(0.5).strokeColor(C.gray300).stroke();

    // Director name
    doc.fillColor(C.gray800).font(fontSemi).fontSize(8)
      .text(`/ ${DIRECTOR_NAME} /`, 360, y, { width: 185 });

    // Draw facsimile signature
    drawSignature(doc, 210, y - 6);

    // Draw company stamp (overlapping signature area)
    drawStamp(doc, 440, y + 20, 38);

    // ── Footer on every page ─────────────────────────────────────

    const range = doc.bufferedPageRange();
    const pageCount = range.count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      // Bottom separator
      doc.moveTo(50, 782).lineTo(545, 782).lineWidth(0.3).strokeColor(C.gray200).stroke();

      doc.fillColor(C.gray400).font(font).fontSize(7)
        .text(
          `${LEGAL_NAME}  |  ${BRAND_URL}  |  Стр. ${i + 1} из ${pageCount}`,
          50, 787,
          { width: 495.28, align: 'center' },
        );
    }

    doc.end();
  });
}

// ─── Render a single violation ─────────────────────────────────────

function renderViolation(
  doc: PDFKit.PDFDocument,
  v: Violation,
  y: number,
  font: string,
  fontBold: string,
  fontSemi: string,
  isHidden: boolean,
  isOutbound: boolean,
): number {
  if (y > 700) {
    doc.addPage();
    y = 50;
    if (isOutbound) drawWatermark(doc, fontBold);
  }

  const cardHeight = isHidden ? 32 : estimateCardHeight(v);

  if (y + cardHeight > 760) {
    doc.addPage();
    y = 50;
    if (isOutbound) drawWatermark(doc, fontBold);
  }

  if (isHidden) {
    // Hidden violation — grayed out row
    doc.roundedRect(50, y, 495.28, 26, 3).fill(C.gray100);

    doc.fillColor(C.gray300).font(fontSemi).fontSize(8)
      .text('[Скрыто]', 60, y + 7, { width: 55 });

    doc.fillColor(C.gray400).font(font).fontSize(8)
      .text(v.title, 120, y + 7, { width: 260, ellipsis: true });

    doc.fillColor(C.gray300).font(fontSemi).fontSize(8)
      .text(`${formatFine(v.minFine)} — ${formatFine(v.maxFine)}`, 385, y + 7, { width: 150, align: 'right' });

    return y + 32;
  }

  // Visible violation — full card
  const sevColor = severityColor(v.severity);

  // Card with left accent bar
  doc.roundedRect(54, y, 491.28, cardHeight, 6)
    .lineWidth(0.5).strokeColor(C.gray200).stroke();
  doc.rect(50, y, 4, cardHeight).fill(sevColor);

  let innerY = y + 8;

  // Severity badge
  doc.roundedRect(64, innerY - 2, 85, 16, 3).fill(sevColor);
  doc.fillColor(C.white).font(fontBold).fontSize(7)
    .text(SEVERITY_LABELS[v.severity] || v.severity, 66, innerY, { width: 81, align: 'center' });

  // Law reference
  doc.fillColor(C.gray400).font(font).fontSize(7)
    .text(`${v.law} | ${v.article}`, 156, innerY, { width: 180 });

  // Fine amount on the right
  doc.fillColor(C.critical).font(fontBold).fontSize(9)
    .text(`${formatFine(v.minFine)} — ${formatFine(v.maxFine)}`, 370, innerY, { width: 165, align: 'right' });

  innerY += 20;

  // Title
  doc.fillColor(C.black).font(fontSemi).fontSize(9)
    .text(v.title, 64, innerY, { width: 471 });
  innerY = doc.y + 3;

  // Description
  doc.fillColor(C.gray500).font(font).fontSize(7.5)
    .text(v.description, 64, innerY, { width: 471 });
  innerY = doc.y + 3;

  // Details
  if (v.details.length > 0) {
    for (const d of v.details.slice(0, 3)) {
      doc.fillColor(C.gray400).font(font).fontSize(7)
        .text(`  \u2022 ${d}`, 64, innerY, { width: 471 });
      innerY = doc.y + 1;
    }
    if (v.details.length > 3) {
      doc.fillColor(C.gray400).font(font).fontSize(7)
        .text(`  ... и ещё ${v.details.length - 3}`, 64, innerY, { width: 471 });
      innerY = doc.y + 1;
    }
  }

  return innerY + 8;
}

function estimateCardHeight(v: Violation): number {
  const baseHeight = 65;
  const detailLines = Math.min(v.details.length, 3) * 12;
  const extraDetail = v.details.length > 3 ? 12 : 0;
  const descriptionExtra = Math.floor(v.description.length / 85) * 10;
  return baseHeight + detailLines + extraDetail + descriptionExtra;
}
