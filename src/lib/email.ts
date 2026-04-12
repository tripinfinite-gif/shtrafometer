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

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const transport = getTransport();
  await transport.sendMail({ from: FROM_EMAIL, to, subject, html });
}

// ─── Email templates ───────────────────────────────────────────────

interface ViolationSummary {
  total: number;
  totalMaxFine: number;
  siteUrl: string;
}

/** Email after email-gate: free recommendations */
export async function sendEmailGateReport(to: string, data: ViolationSummary): Promise<void> {
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

    <p style="font-size:15px;line-height:1.6;margin:0 0 16px">
      Для получения полного отчёта с рекомендациями по исправлению перейдите на сайт:
      <a href="https://shtrafometer.ru" style="color:#6C5CE7">shtrafometer.ru</a>
    </p>

    <p style="font-size:13px;color:#999;margin:24px 0 0;border-top:1px solid #eee;padding-top:16px">
      Штрафометр — сервис проверки сайтов на соответствие законам РФ.<br>
      ООО «Инворк» | ИНН 7806618194 | info@shtrafometer.ru<br>
      Результаты носят информационный характер.
    </p>
  </div>
</body>
</html>
    `.trim(),
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
