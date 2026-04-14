import nodemailer from 'nodemailer';

// ─── Config ────────────────────────────────────────────────────────

let _transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.yandex.ru',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }
  return _transport;
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'Штрафометр <noreply@shtrafometer.ru>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@shtrafometer.ru';

// ─── Helpers ───────────────────────────────────────────────────────

function formatMoney(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendMail(to: string, subject: string, html: string, attachments?: nodemailer.SendMailOptions['attachments']): Promise<void> {
  const transport = getTransport();
  await transport.sendMail({ from: FROM_EMAIL, to, subject, html, attachments });
}

// ─── OTP Email ────────────────────────────────────────────────────

/** Send 6-digit login code via email */
export async function sendEmailOtpCode(to: string, code: string): Promise<void> {
  await sendMail(
    to,
    `${code} — код входа в Штрафометр`,
    `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:40px 20px">
    <div style="background:#fff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <div style="text-align:center;margin-bottom:28px">
        <div style="display:inline-block;background:#6C5CE7;border-radius:10px;padding:8px 14px">
          <span style="color:#fff;font-size:18px;font-weight:700">Штрафометр</span>
        </div>
      </div>
      <p style="font-size:15px;color:#374151;margin:0 0 20px;text-align:center">
        Ваш код для входа в личный кабинет:
      </p>
      <div style="background:#F3F0FF;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <span style="font-size:36px;font-weight:700;color:#6C5CE7;letter-spacing:8px">${code}</span>
      </div>
      <p style="font-size:13px;color:#9CA3AF;text-align:center;margin:0">
        Код действителен 5 минут. Не передавайте его никому.
      </p>
    </div>
    <p style="text-align:center;font-size:11px;color:#D1D5DB;margin-top:20px">
      ООО «Инворк» · shtrafometer.ru
    </p>
  </div>
</body>
</html>
    `.trim(),
  );
}

// ─── Email templates ───────────────────────────────────────────────

interface ViolationSummary {
  total: number;
  totalMaxFine: number;
  siteUrl: string;
}

/** Email after email-gate: free recommendations + PDF attachment */
export async function sendEmailGateReport(to: string, data: ViolationSummary & { pdfBuffer?: Buffer; domain?: string }): Promise<void> {
  const attachments = data.pdfBuffer ? [{
    filename: `report-${data.domain || 'site'}-${Date.now()}.pdf`,
    content: data.pdfBuffer,
    contentType: 'application/pdf' as const,
  }] : undefined;
  await sendMail(
    to,
    `Результаты проверки сайта ${escapeHtml(data.siteUrl)}`,
    `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;color:#333">
  <div style="max-width:600px;margin:0 auto;padding:20px">
    <p style="font-size:15px;margin:0 0 16px">Здравствуйте!</p>

    <p style="font-size:15px;line-height:1.6;margin:0 0 16px">
      Мы провели автоматическую проверку сайта <b>${escapeHtml(data.siteUrl)}</b> на соответствие законодательству РФ.
    </p>

    <p style="font-size:15px;line-height:1.6;margin:0 0 16px">
      Найдено нарушений: <b>${data.total}</b>.<br>
      Потенциальные штрафы: до <b>${formatMoney(data.totalMaxFine)}</b>.
    </p>

    ${data.pdfBuffer ? `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">
      PDF-отчёт с подробными рекомендациями прикреплён к этому письму.
    </p>` : `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">
      Для получения полного отчёта с рекомендациями по исправлению перейдите на сайт:
      <a href="https://shtrafometer.ru" style="color:#6C5CE7">shtrafometer.ru</a>
    </p>`}

    <p style="font-size:13px;color:#999;margin:24px 0 0;border-top:1px solid #eee;padding-top:16px">
      Штрафометр — сервис проверки сайтов на соответствие законам РФ.<br>
      ООО «Инворк» | ИНН 7806618194 | info@shtrafometer.ru<br>
      Результаты носят информационный характер.
    </p>
  </div>
</body>
</html>
    `.trim(),
    attachments,
  );
}

/** Email after paid order: confirmation + next steps */
export async function sendOrderConfirmation(to: string, data: {
  orderId: string;
  name: string;
  productType: string;
  siteUrl: string;
  price: number;
}): Promise<void> {
  const productNames: Record<string, string> = {
    'report': 'PDF-отчёт',
    'autofix-basic': 'Автоисправление — базовый',
    'autofix-std': 'Автоисправление — стандарт',
    'autofix-prem': 'Автоисправление + проверка',
    'monitoring': 'Мониторинг',
    'consulting': 'Консалтинг',
  };

  await sendMail(
    to,
    `Заявка #${data.orderId} — ${productNames[data.productType] || 'Услуга'} | Штрафометр`,
    `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px">
    <div style="background:#fff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <div style="text-align:center;margin-bottom:32px">
        <div style="display:inline-block;background:#6C5CE7;border-radius:10px;padding:8px 12px">
          <span style="color:#fff;font-size:18px;font-weight:700">Штрафометр</span>
        </div>
      </div>

      <div style="background:#F0FDF4;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
        <p style="font-size:16px;font-weight:600;color:#22C55E;margin:0">Заявка принята</p>
      </div>

      <h1 style="font-size:20px;font-weight:600;color:#212529;margin:0 0 20px">
        ${escapeHtml(data.name)}, спасибо за заказ!
      </h1>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6c757d;border-bottom:1px solid #f1f3f5">Заявка</td>
          <td style="padding:8px 0;font-size:13px;color:#212529;text-align:right;border-bottom:1px solid #f1f3f5;font-weight:500">#${data.orderId}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6c757d;border-bottom:1px solid #f1f3f5">Услуга</td>
          <td style="padding:8px 0;font-size:13px;color:#212529;text-align:right;border-bottom:1px solid #f1f3f5;font-weight:500">${escapeHtml(productNames[data.productType] || data.productType)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6c757d;border-bottom:1px solid #f1f3f5">Сайт</td>
          <td style="padding:8px 0;font-size:13px;color:#212529;text-align:right;border-bottom:1px solid #f1f3f5;font-weight:500">${escapeHtml(data.siteUrl)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6c757d">Стоимость</td>
          <td style="padding:8px 0;font-size:13px;color:#212529;text-align:right;font-weight:600">${formatMoney(data.price)}</td>
        </tr>
      </table>

      <p style="font-size:14px;color:#495057;line-height:1.6;margin:0 0 24px">
        Мы свяжемся с вами в ближайшее время для уточнения деталей и начала работы.
        Если у вас есть вопросы — звоните: <a href="tel:+79851313323" style="color:#6C5CE7;text-decoration:none">+7 (985) 131-33-23</a>
      </p>
    </div>

    <div style="text-align:center;padding:24px 0">
      <p style="font-size:11px;color:#adb5bd;margin:0">
        ООО «Инворк» | ИНН 7806618194 | info@shtrafometer.ru
      </p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  );
}

/** Notify admin about new order */
export async function sendAdminNotification(data: {
  orderId: string;
  name: string;
  email: string;
  phone: string;
  productType: string;
  siteUrl: string;
  violations: number;
  totalMaxFine: number;
}): Promise<void> {
  await sendMail(
    ADMIN_EMAIL,
    `Новая заявка #${data.orderId} — ${data.productType} | ${data.siteUrl}`,
    `
<h2>Новая заявка #${escapeHtml(data.orderId)}</h2>
<ul>
  <li><b>Тип:</b> ${escapeHtml(data.productType)}</li>
  <li><b>Сайт:</b> ${escapeHtml(data.siteUrl)}</li>
  <li><b>Имя:</b> ${escapeHtml(data.name)}</li>
  <li><b>Email:</b> ${escapeHtml(data.email)}</li>
  <li><b>Телефон:</b> ${escapeHtml(data.phone)}</li>
  <li><b>Нарушений:</b> ${data.violations}</li>
  <li><b>Макс. штраф:</b> ${formatMoney(data.totalMaxFine)}</li>
</ul>
<p><a href="https://shtrafometer.ru/admin/orders/${encodeURIComponent(data.orderId)}">Открыть в админке</a></p>
    `.trim(),
  );
}

// ─── Monitoring Report Email ────────────────────────────────────────

export async function sendMonitoringReport(
  email: string,
  data: {
    domain: string;
    complianceScore: number;
    prevScore: number;
    violations: number;
    prevViolations: number;
    totalMaxFine: number;
    newViolations: number;
    fixedViolations: number;
    recurringViolations: number;
  },
): Promise<void> {
  const scoreDiff = data.complianceScore - data.prevScore;
  const scoreTrend = scoreDiff > 0 ? `\u2191${scoreDiff}` : scoreDiff < 0 ? `\u2193${Math.abs(scoreDiff)}` : '\u2192 без изменений';
  const scoreColor = data.complianceScore > 80 ? '#22C55E' : data.complianceScore > 60 ? '#EAB308' : data.complianceScore > 30 ? '#F97316' : '#EF4444';

  await sendMail(
    email,
    `${escapeHtml(data.domain)} \u2014 Score: ${data.complianceScore}/100 (${scoreTrend}) | \u0428\u0442\u0440\u0430\u0444\u043e\u043c\u0435\u0442\u0440`,
    `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#6C5CE7;padding:24px;border-radius:16px 16px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:20px;">\u0415\u0436\u0435\u043c\u0435\u0441\u044f\u0447\u043d\u044b\u0439 \u043e\u0442\u0447\u0451\u0442</h1>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">${escapeHtml(data.domain)}</p>
  </div>
  <div style="background:white;padding:24px;border:1px solid #E5E7EB;border-top:none;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:80px;height:80px;border-radius:50%;border:6px solid ${scoreColor};line-height:68px;text-align:center;">
        <span style="font-size:28px;font-weight:bold;color:#1F2937;">${data.complianceScore}</span>
      </div>
      <p style="color:#6B7280;font-size:13px;margin:8px 0 0;">Compliance Score (${scoreTrend})</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#6B7280;font-size:13px;">\u041d\u0430\u0440\u0443\u0448\u0435\u043d\u0438\u0439</td>
        <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;text-align:right;font-weight:600;">${data.violations} ${data.prevViolations !== data.violations ? `(\u0431\u044b\u043b\u043e ${data.prevViolations})` : ''}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#6B7280;font-size:13px;">\u041c\u0430\u043a\u0441. \u0448\u0442\u0440\u0430\u0444</td>
        <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;text-align:right;font-weight:600;">${formatMoney(data.totalMaxFine)}</td>
      </tr>
      ${data.newViolations > 0 ? `<tr><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#EF4444;font-size:13px;">\u041d\u043e\u0432\u044b\u0445 \u043d\u0430\u0440\u0443\u0448\u0435\u043d\u0438\u0439</td><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;text-align:right;font-weight:600;color:#EF4444;">+${data.newViolations}</td></tr>` : ''}
      ${data.fixedViolations > 0 ? `<tr><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#22C55E;font-size:13px;">\u0418\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e</td><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;text-align:right;font-weight:600;color:#22C55E;">${data.fixedViolations}</td></tr>` : ''}
    </table>

    <div style="text-align:center;">
      <a href="https://shtrafometer.ru/cabinet/sites/${encodeURIComponent(data.domain)}" style="display:inline-block;background:#6C5CE7;color:white;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:500;font-size:14px;">
        \u041f\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u043f\u043e\u043b\u043d\u044b\u0439 \u043e\u0442\u0447\u0451\u0442
      </a>
    </div>
    ${data.violations > 0 ? `
    <p style="text-align:center;margin-top:16px;">
      <a href="https://shtrafometer.ru/cabinet/sites/${encodeURIComponent(data.domain)}" style="color:#6C5CE7;font-size:13px;text-decoration:none;">
        \u0418\u0441\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043d\u0430\u0440\u0443\u0448\u0435\u043d\u0438\u044f \u0441\u043e \u0441\u043a\u0438\u0434\u043a\u043e\u0439 50% &rarr;
      </a>
    </p>` : ''}
  </div>
  <div style="background:#F9FAFB;padding:16px 24px;border-radius:0 0 16px 16px;border:1px solid #E5E7EB;border-top:none;">
    <p style="color:#9CA3AF;font-size:11px;margin:0;text-align:center;">
      \u0428\u0442\u0440\u0430\u0444\u043e\u043c\u0435\u0442\u0440 &middot; \u0415\u0436\u0435\u043c\u0435\u0441\u044f\u0447\u043d\u044b\u0439 \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433 &middot; <a href="https://shtrafometer.ru/cabinet/settings" style="color:#9CA3AF;">\u041e\u0442\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f</a>
    </p>
  </div>
</div>
    `.trim(),
  );
}
