import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'path';
import type { CheckResponse, Violation } from '@/checks/types';

// ─── Types ─────────────────────────────────────────────────────────

export type ReportMode = 'outbound' | 'full';

export interface ReportOptions {
  mode: ReportMode;
  visibleCount?: number;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

const DEFAULT_VISIBLE_COUNT = 3;
const BRAND_NAME = 'Штрафометр';
const BRAND_URL = 'https://shtrafometer.ru';
const LEGAL_NAME = 'ООО «Инворк»';
const LEGAL_INN = 'ИНН 7806618194';
const LEGAL_OGRN = 'ОГРН 1247800025032';
const DIRECTOR_NAME = 'Н.Н. Вельковская';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = { top: 50, bottom: 55, left: 50, right: 50 };
const CW = PAGE_W - M.left - M.right; // content width

// ─── Colors ────────────────────────────────────────────────────────

const C = {
  primary: '#6C5CE7',
  primaryDark: '#5A4BD1',
  primaryLight: '#EDE9FE',
  black: '#1A1D23',
  gray900: '#212529',
  gray700: '#495057',
  gray500: '#6C757D',
  gray400: '#868E96',
  gray300: '#CED4DA',
  gray200: '#DEE2E6',
  gray100: '#F1F3F5',
  gray50: '#F8F9FA',
  white: '#FFFFFF',
  critical: '#E03131',
  high: '#E8590C',
  medium: '#F59F00',
  low: '#2F9E44',
  hidden: '#ADB5BD',
  stamp: '#6C5CE7',
} as const;

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'КРИТИЧЕСКИЙ', high: 'ВЫСОКИЙ', medium: 'СРЕДНИЙ', low: 'НИЗКИЙ',
};

const RISK_LABEL: Record<string, string> = {
  critical: 'КРИТИЧЕСКИЙ', high: 'ВЫСОКИЙ', medium: 'СРЕДНИЙ', low: 'НИЗКИЙ',
};

// ─── Helpers ───────────────────────────────────────────────────────

function formatFine(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} млн ₽`;
  }
  return n.toLocaleString('ru-RU') + ' ₽';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function sevColor(s: string): string {
  return C[s as keyof typeof C] || C.medium;
}

function genReportNum(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function getFontsDir(): string {
  return path.join(process.cwd(), 'public', 'fonts');
}

// ─── QR ────────────────────────────────────────────────────────────

async function genQR(url: string): Promise<Buffer | null> {
  try {
    return await QRCode.toBuffer(url, { width: 80, margin: 1, color: { dark: C.primary, light: '#FFFFFF00' }, errorCorrectionLevel: 'M' });
  } catch { return null; }
}

// ─── Stamp & Signature ─────────────────────────────────────────────

function drawStamp(doc: PDFKit.PDFDocument, cx: number, cy: number, r: number) {
  doc.save().opacity(0.6);
  doc.circle(cx, cy, r).lineWidth(2).strokeColor(C.stamp).stroke();
  doc.circle(cx, cy, r - 4).lineWidth(0.8).strokeColor(C.stamp).stroke();
  doc.circle(cx, cy, r - 18).lineWidth(0.8).strokeColor(C.stamp).stroke();
  // Star
  const pts = 5, oR = 8, iR = 4;
  doc.fillColor(C.stamp);
  const step = Math.PI / pts;
  doc.moveTo(cx, cy - oR);
  for (let i = 1; i < 2 * pts; i++) {
    const rad = i % 2 === 0 ? oR : iR;
    doc.lineTo(cx + rad * Math.sin(i * step), cy - rad * Math.cos(i * step));
  }
  doc.closePath().fill();
  // Arc text
  arcText(doc, LEGAL_NAME, cx, cy, r - 11, -0.75 * Math.PI, 0.75 * Math.PI, 6);
  arcText(doc, `${LEGAL_INN}*${LEGAL_OGRN}`, cx, cy, r - 11, 1.25 * Math.PI, 0.75 * Math.PI, 5, true);
  doc.restore();
}

function arcText(doc: PDFKit.PDFDocument, text: string, cx: number, cy: number, r: number, start: number, end: number, fs: number, flip = false) {
  doc.fontSize(fs).fillColor(C.stamp);
  const chars = text.split('');
  const total = end - start;
  const step = total / (chars.length + 1);
  for (let i = 0; i < chars.length; i++) {
    const a = start + step * (i + 1) - Math.PI / 2;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    doc.save().translate(x, y).rotate((a + Math.PI / 2 + (flip ? Math.PI : 0)) * 180 / Math.PI);
    doc.text(chars[i], -fs / 4, -fs / 2, { width: fs, align: 'center' });
    doc.restore();
  }
}

function drawSignature(doc: PDFKit.PDFDocument, x: number, y: number) {
  doc.save().strokeColor(C.primaryDark).lineWidth(1).opacity(0.75);
  doc.moveTo(x, y + 10).bezierCurveTo(x + 10, y - 2, x + 20, y + 16, x + 30, y + 4)
    .bezierCurveTo(x + 40, y - 4, x + 50, y + 12, x + 60, y + 2)
    .bezierCurveTo(x + 70, y - 4, x + 80, y + 10, x + 90, y + 6).stroke();
  doc.moveTo(x + 15, y + 16).bezierCurveTo(x + 35, y + 20, x + 65, y + 14, x + 85, y + 18).stroke();
  doc.restore();
}

function drawWatermark(doc: PDFKit.PDFDocument, fontBold: string) {
  doc.save().opacity(0.035).translate(PAGE_W / 2, PAGE_H / 2).rotate(-45);
  doc.font(fontBold).fontSize(54).fillColor(C.primary).text('ШТРАФОМЕТР', -180, -25, { width: 360, align: 'center' });
  doc.restore();
}

// ─── Main generator ────────────────────────────────────────────────

export async function generateReport(data: CheckResponse, options: ReportOptions): Promise<Buffer> {
  const { mode, visibleCount = DEFAULT_VISIBLE_COUNT, companyName, contactEmail = 'info@shtrafometer.ru' } = options;
  const isOutbound = mode === 'outbound';
  const visible = isOutbound ? data.violations.slice(0, visibleCount) : data.violations;
  const hidden = isOutbound ? data.violations.slice(visibleCount) : [];
  const reportNum = genReportNum();
  const qrBuffer = await genQR(`${BRAND_URL}/?url=${encodeURIComponent(data.url)}`);

  const fontsDir = getFontsDir();
  const fontR = path.join(fontsDir, 'Inter-Regular.ttf');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: M,
      bufferPages: true,
      font: fontR,
      info: { Title: `Отчёт — ${data.url}`, Author: LEGAL_NAME, Subject: 'Проверка соответствия законодательству РФ' },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('R', fontR);
    doc.registerFont('B', path.join(fontsDir, 'Inter-Bold.ttf'));
    doc.registerFont('SB', path.join(fontsDir, 'Inter-SemiBold.ttf'));

    let y = M.top;
    const bottomLimit = PAGE_H - M.bottom - 10;

    function ensureSpace(needed: number) {
      if (y + needed > bottomLimit) {
        doc.addPage();
        y = M.top;
        if (isOutbound) drawWatermark(doc, 'B');
      }
    }

    // ── WATERMARK ──
    if (isOutbound) drawWatermark(doc, 'B');

    // ══════════════════════════════════════════════════════════════
    // HEADER BAR
    // ══════════════════════════════════════════════════════════════
    doc.rect(0, 0, PAGE_W, 70).fill(C.primary);
    doc.font('B').fontSize(18).fillColor(C.white).text(BRAND_NAME, M.left, 14);
    doc.font('R').fontSize(7.5).fillColor('#C4B5FD').text('Проверка сайтов на соответствие законодательству РФ', M.left, 35);
    doc.font('R').fontSize(7.5).fillColor('#C4B5FD').text(BRAND_URL, M.left, 46);
    doc.font('SB').fontSize(7.5).fillColor(C.white).text(`Отчёт № ${reportNum}`, 380, 16, { width: 165, align: 'right' });
    doc.font('R').fontSize(7.5).fillColor('#C4B5FD').text(`от ${formatDate(data.checkedAt)}`, 380, 28, { width: 165, align: 'right' });
    doc.font('R').fontSize(7).fillColor('#C4B5FD').text(LEGAL_NAME, 380, 42, { width: 165, align: 'right' });

    y = 84;

    // ══════════════════════════════════════════════════════════════
    // TITLE
    // ══════════════════════════════════════════════════════════════
    doc.fillColor(C.black).font('B').fontSize(14).text('Отчёт о проверке сайта', M.left, y);
    y += 20;
    doc.fillColor(C.primary).font('SB').fontSize(11).text(data.url, M.left, y);
    y += 16;
    if (companyName) {
      doc.fillColor(C.gray500).font('R').fontSize(8).text(`Организация: ${companyName}`, M.left, y);
      y += 14;
    }
    const siteTypeLabel = data.siteType === 'ecommerce' ? 'Интернет-магазин' : data.siteType === 'service' ? 'Сайт услуг' : 'Информационный';
    doc.fillColor(C.gray400).font('R').fontSize(8).text(`Тип сайта: ${siteTypeLabel}`, M.left, y);
    y += 16;

    // ══════════════════════════════════════════════════════════════
    // RISK SUMMARY BOX
    // ══════════════════════════════════════════════════════════════
    const riskC = sevColor(data.riskLevel);
    const boxH = 65;
    doc.roundedRect(M.left, y, CW, boxH, 6).fill(C.gray50);
    doc.rect(M.left, y, 4, boxH).fill(riskC);

    // Badge
    doc.roundedRect(M.left + 16, y + 8, 100, 20, 3).fill(riskC);
    doc.font('B').fontSize(8).fillColor(C.white).text(`Риск: ${RISK_LABEL[data.riskLevel] || ''}`, M.left + 20, y + 13, { width: 92, align: 'center' });

    // Fines
    doc.fillColor(C.black).font('B').fontSize(14).text(`${formatFine(data.totalMinFine)} — ${formatFine(data.totalMaxFine)}`, M.left + 130, y + 8, { width: CW - 140 });
    doc.fillColor(C.gray500).font('R').fontSize(7.5).text('Потенциальная сумма штрафов для юридического лица', M.left + 130, y + 26);

    // Stats
    doc.fillColor(C.gray700).font('SB').fontSize(8);
    doc.text(`Нарушений: ${data.stats.violations}`, M.left + 16, y + 46);
    doc.text(`Предупреждений: ${data.stats.warnings}`, M.left + 150, y + 46);
    doc.text(`Пройдено: ${data.stats.passed}`, M.left + 320, y + 46);
    y += boxH + 14;

    // ══════════════════════════════════════════════════════════════
    // FINES BY LAW (compact table)
    // ══════════════════════════════════════════════════════════════
    ensureSpace(60);
    doc.fillColor(C.black).font('B').fontSize(11).text('Штрафы по законам', M.left, y);
    y += 16;

    const laws = Object.entries(data.finesByLaw).sort(([, a], [, b]) => b.max - a.max);
    for (const [law, info] of laws) {
      ensureSpace(22);
      doc.roundedRect(M.left, y, CW, 20, 2).fill(C.gray50);
      doc.fillColor(C.gray900).font('SB').fontSize(7.5).text(law, M.left + 10, y + 5, { width: 100 });
      doc.fillColor(C.gray400).font('R').fontSize(7.5).text(`${info.count} наруш.`, M.left + 120, y + 5, { width: 60 });
      doc.fillColor(C.critical).font('B').fontSize(7.5).text(`${formatFine(info.min)} — ${formatFine(info.max)}`, M.left + 200, y + 5, { width: CW - 210, align: 'right' });
      y += 23;
    }

    // ══════════════════════════════════════════════════════════════
    // VISIBLE VIOLATIONS
    // ══════════════════════════════════════════════════════════════
    y += 10;
    ensureSpace(40);
    doc.fillColor(C.black).font('B').fontSize(11).text(isOutbound ? 'Основные нарушения' : 'Все нарушения', M.left, y);
    y += 18;

    for (const v of visible) {
      y = renderViolationCompact(doc, v, y, false, isOutbound, bottomLimit);
    }

    // ══════════════════════════════════════════════════════════════
    // HIDDEN VIOLATIONS (outbound)
    // ══════════════════════════════════════════════════════════════
    if (isOutbound && hidden.length > 0) {
      ensureSpace(30);
      y += 6;
      doc.fillColor(C.gray700).font('B').fontSize(10).text(`Ещё ${hidden.length} нарушений скрыто`, M.left, y);
      y += 16;

      for (const v of hidden) {
        y = renderHiddenRow(doc, v, y, bottomLimit, isOutbound);
      }

      // CTA
      ensureSpace(60);
      y += 8;
      const ctaH = 55;
      doc.roundedRect(M.left, y, CW, ctaH, 6).fill(C.primary);
      const textW = qrBuffer ? CW - 90 : CW - 20;
      doc.fillColor(C.white).font('B').fontSize(11).text('Получите полный отчёт с рекомендациями', M.left + 14, y + 10, { width: textW });
      doc.fillColor(C.white).font('R').fontSize(8).text(`Свяжитесь с нами: ${contactEmail}`, M.left + 14, y + 26, { width: textW });
      doc.fillColor('#C4B5FD').font('R').fontSize(7.5).text(`Или проверьте сайт: ${BRAND_URL}`, M.left + 14, y + 38, { width: textW });
      if (qrBuffer) doc.image(qrBuffer, M.left + CW - 65, y + 5, { width: 45, height: 45 });
      y += ctaH + 12;
    }

    // ══════════════════════════════════════════════════════════════
    // WARNINGS
    // ══════════════════════════════════════════════════════════════
    if (data.warnings.length > 0) {
      ensureSpace(40);
      doc.fillColor(C.black).font('B').fontSize(11).text('Предупреждения', M.left, y);
      y += 16;

      for (const w of data.warnings) {
        ensureSpace(24);
        doc.roundedRect(M.left, y, CW, 22, 2).lineWidth(0.5).strokeColor(C.medium).stroke();
        doc.fillColor(C.medium).font('SB').fontSize(7).text(w.law, M.left + 8, y + 5, { width: 55 });
        doc.fillColor(C.gray900).font('R').fontSize(7.5).text(w.title, M.left + 70, y + 5, { width: CW - 170 });
        doc.fillColor(C.gray400).font('R').fontSize(7).text(w.potentialFine, M.left + CW - 100, y + 5, { width: 92, align: 'right' });
        y += 26;
      }
    }

    // ══════════════════════════════════════════════════════════════
    // SEO AUDIT (compact — no forced page break)
    // ══════════════════════════════════════════════════════════════
    {
      const seoV = data.violations.filter(v => v.module === 'seo');
      const seoP = data.passed.filter(p => p.module === 'seo');
      const seoW = data.warnings.filter(w => w.id?.startsWith('seo-'));
      const allSeo = [
        ...seoP.map(p => ({ id: p.id, title: p.title, status: 'passed' as const })),
        ...seoV.map(v => ({ id: v.id, title: v.title, status: 'violation' as const })),
        ...seoW.map(w => ({ id: w.id, title: w.title, status: 'warning' as const })),
      ];

      if (allSeo.length > 0) {
        ensureSpace(100);
        y += 10;
        doc.fillColor(C.black).font('B').fontSize(12).text('Технический SEO-аудит', M.left, y);
        y += 22;

        // Score
        const score = Math.max(0, Math.min(100, 100 - seoV.length * 7));
        const scoreC = score >= 80 ? C.low : score >= 50 ? C.medium : C.critical;

        doc.roundedRect(M.left, y, CW, 45, 6).fill(C.gray50);
        doc.fillColor(scoreC).font('B').fontSize(28).text(String(score), M.left + 14, y + 6);
        doc.fillColor(C.gray500).font('R').fontSize(8).text('из 100', M.left + 14, y + 32);
        doc.fillColor(C.gray900).font('SB').fontSize(9).text('SEO-оценка сайта', M.left + 80, y + 8);
        doc.fillColor(C.gray400).font('R').fontSize(7.5).text(
          `Проверено: ${allSeo.length} | Проблем: ${seoV.length} | Предупреждений: ${seoW.length} | Пройдено: ${seoP.length}`,
          M.left + 80, y + 22,
        );

        // Progress bar
        const barX = M.left + 80, barY = y + 35, barW = CW - 100, barH = 5;
        doc.roundedRect(barX, barY, barW, barH, 2).fill(C.gray200);
        doc.roundedRect(barX, barY, barW * score / 100, barH, 2).fill(scoreC);

        y += 55;

        // SEO table
        ensureSpace(30);
        // Header row
        doc.roundedRect(M.left, y, CW, 16, 2).fill(C.primary);
        doc.fillColor(C.white).font('SB').fontSize(7);
        doc.text('Проверка', M.left + 8, y + 4, { width: 220 });
        doc.text('Статус', M.left + 240, y + 4, { width: 80 });
        doc.text('Результат', M.left + CW - 120, y + 4, { width: 112, align: 'right' });
        y += 19;

        const fixPrices: Record<string, string> = {
          'seo-01': '5 000–15 000 ₽', 'seo-09': '200–800 ₽', 'seo-10': '300–1 000 ₽',
          'seo-11': '300–1 000 ₽', 'seo-14': '500–1 500 ₽',
        };

        for (const check of allSeo) {
          ensureSpace(18);
          doc.roundedRect(M.left, y, CW, 16, 1).fill(C.gray50);
          doc.fillColor(C.gray900).font('R').fontSize(7).text(check.title, M.left + 8, y + 3, { width: 220 });

          const stLabel = check.status === 'passed' ? '  Пройдена' : check.status === 'warning' ? '  Внимание' : '  Проблема';
          const stColor = check.status === 'passed' ? C.low : check.status === 'warning' ? C.medium : C.critical;
          doc.fillColor(stColor).font('SB').fontSize(7).text(stLabel, M.left + 240, y + 3, { width: 80 });

          const price = check.status !== 'passed' ? (fixPrices[check.id] || '') : '—';
          doc.fillColor(C.gray400).font('R').fontSize(7).text(price, M.left + CW - 120, y + 3, { width: 112, align: 'right' });
          y += 18;
        }

        // SEO problems detail
        const seoProblems = seoV.slice(0, 5);
        if (seoProblems.length > 0) {
          y += 8;
          ensureSpace(30);
          doc.fillColor(C.gray700).font('SB').fontSize(9).text('Подробности по SEO-проблемам', M.left, y);
          y += 14;

          for (const v of seoProblems) {
            const recText = v.recommendation || '';
            const estH = 50 + (recText.length > 100 ? 16 : 0);
            ensureSpace(estH);

            doc.roundedRect(M.left, y, CW, 1, 0).fill(C.gray200);
            y += 4;
            doc.fillColor(C.gray900).font('SB').fontSize(8).text(v.title, M.left, y);
            y += 12;
            if (v.description) {
              doc.fillColor(C.gray500).font('R').fontSize(7.5).text(v.description, M.left, y, { width: CW });
              y += doc.heightOfString(v.description, { width: CW}) + 4;
            }
            if (recText) {
              doc.fillColor(C.primary).font('R').fontSize(7.5).text(`Рекомендация: ${recText}`, M.left, y, { width: CW });
              y += doc.heightOfString(`Рекомендация: ${recText}`, { width: CW}) + 4;
            }
            const fPrice = fixPrices[v.id];
            if (fPrice) {
              doc.fillColor(C.gray400).font('R').fontSize(7).text(`Стоимость исправления: ${fPrice}`, M.left, y);
              y += 12;
            }
            y += 4;
          }
        }
      }
    }

    // ══════════════════════════════════════════════════════════════
    // FOOTER: stamp + signature (last page only)
    // ══════════════════════════════════════════════════════════════
    ensureSpace(90);
    y += 10;

    // Divider
    doc.moveTo(M.left, y).lineTo(M.left + CW, y).lineWidth(0.5).strokeColor(C.gray300).stroke();
    y += 10;

    // Legal info
    doc.fillColor(C.gray400).font('R').fontSize(7);
    doc.text(`${LEGAL_NAME} | ${LEGAL_INN} | ${LEGAL_OGRN}`, M.left, y);
    y += 10;
    doc.text(`Дата формирования отчёта: ${new Date().toLocaleDateString('ru-RU')}`, M.left, y);
    doc.text(`Отчёт № ${reportNum}`, M.left + 300, y, { width: CW - 300, align: 'right' });
    y += 16;

    // Signature line
    doc.text('Генеральный директор', M.left, y + 6);
    drawSignature(doc, M.left + 130, y);
    doc.text(`/ ${DIRECTOR_NAME} /`, M.left + 240, y + 6);

    // Stamp
    drawStamp(doc, M.left + 390, y + 5, 30);

    // ══════════════════════════════════════════════════════════════
    // PAGE NUMBERS (all pages)
    // ══════════════════════════════════════════════════════════════
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fillColor(C.gray400).font('R').fontSize(7);
      doc.text(`${LEGAL_NAME} | ${BRAND_URL} | Стр. ${i + 1} из ${totalPages}`, M.left, PAGE_H - 30, { width: CW, align: 'center' });
    }

    doc.end();
  });
}

// ─── Render: full violation (compact) ──────────────────────────────

function renderViolationCompact(
  doc: PDFKit.PDFDocument, v: Violation, y: number,
  isHidden: boolean, isOutbound: boolean, bottomLimit: number,
): number {
  // Estimate height: title + law + fine + description + details
  const descH = v.description ? Math.min(doc.heightOfString(v.description, { width: CW - 20}), 40) : 0;
  const detailsH = v.details?.length ? Math.min(v.details.length * 11, 44) : 0;
  const recH = v.recommendation ? Math.min(doc.heightOfString(v.recommendation, { width: CW - 20}), 28) : 0;
  const totalH = 32 + descH + detailsH + recH + 10;

  if (y + totalH > bottomLimit) {
    doc.addPage();
    y = M.top;
    if (isOutbound) drawWatermark(doc, 'B');
  }

  const sc = sevColor(v.severity);

  // Card background
  doc.roundedRect(M.left, y, CW, totalH - 4, 4).lineWidth(0.5).strokeColor(C.gray200).stroke();
  doc.rect(M.left, y, 3, totalH - 4).fill(sc);

  // Severity badge
  const badgeW = 85;
  doc.roundedRect(M.left + 10, y + 6, badgeW, 14, 2).fill(sc);
  doc.font('B').fontSize(6.5).fillColor(C.white).text(SEVERITY_LABEL[v.severity] || v.severity, M.left + 12, y + 9, { width: badgeW - 4, align: 'center' });

  // Law + article
  doc.fillColor(C.gray500).font('R').fontSize(7).text(`${v.law} | ${v.article}`, M.left + badgeW + 18, y + 9, { width: 180 });

  // Fine (right)
  doc.fillColor(sc).font('B').fontSize(8).text(`${formatFine(v.minFine)} — ${formatFine(v.maxFine)}`, M.left + CW - 160, y + 8, { width: 150, align: 'right' });

  let cy = y + 24;

  // Title
  doc.fillColor(C.black).font('SB').fontSize(9).text(v.title, M.left + 10, cy, { width: CW - 20 });
  cy += doc.heightOfString(v.title, { width: CW - 20 }) + 3;

  // Description
  if (v.description) {
    const maxDescLines = 3;
    const lines = v.description.split('\n').slice(0, maxDescLines).join('\n');
    doc.fillColor(C.gray500).font('R').fontSize(7.5).text(lines, M.left + 10, cy, { width: CW - 20, lineGap: 1 });
    cy += Math.min(descH, 40) + 2;
  }

  // Details (max 4)
  if (v.details?.length) {
    const maxDetails = 4;
    for (let i = 0; i < Math.min(v.details.length, maxDetails); i++) {
      const detail = v.details[i].length > 120 ? v.details[i].slice(0, 117) + '...' : v.details[i];
      doc.fillColor(C.gray400).font('R').fontSize(6.5).text(`  • ${detail}`, M.left + 10, cy, { width: CW - 20 });
      cy += 11;
    }
    if (v.details.length > maxDetails) {
      doc.fillColor(C.gray300).font('R').fontSize(6.5).text(`  ... и ещё ${v.details.length - maxDetails}`, M.left + 10, cy);
      cy += 11;
    }
  }

  // Recommendation
  if (v.recommendation) {
    doc.fillColor(C.primary).font('R').fontSize(7).text(`→ ${v.recommendation}`, M.left + 10, cy, { width: CW - 20 });
    cy += recH + 2;
  }

  return cy + 8;
}

// ─── Render: hidden violation row ──────────────────────────────────

function renderHiddenRow(doc: PDFKit.PDFDocument, v: Violation, y: number, bottomLimit: number, isOutbound: boolean): number {
  if (y + 20 > bottomLimit) {
    doc.addPage();
    y = M.top;
    if (isOutbound) drawWatermark(doc, 'B');
  }

  doc.roundedRect(M.left, y, CW, 18, 2).fill(C.gray50);
  doc.fillColor(C.hidden).font('SB').fontSize(7).text('[Скрыто]', M.left + 8, y + 4, { width: 50 });
  doc.fillColor(C.gray700).font('R').fontSize(7.5).text(v.title, M.left + 62, y + 4, { width: CW - 180 });
  doc.fillColor(C.gray400).font('R').fontSize(7).text(`${formatFine(v.minFine)} — ${formatFine(v.maxFine)}`, M.left + CW - 120, y + 4, { width: 112, align: 'right' });
  return y + 21;
}
