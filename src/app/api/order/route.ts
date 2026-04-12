import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/storage';
import { sendEmailGateReport, sendAdminNotification } from '@/lib/email';
import { generateReport } from '@/lib/pdf-report';
import { extractDomain } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, siteUrl, violations, totalMaxFine, productType, checkResult } = body;

    // email-lead requires only email, others need name+phone
    if (productType === 'email-lead') {
      if (!email) {
        return NextResponse.json(
          { error: 'Укажите email' },
          { status: 400 }
        );
      }
    } else if (!name || !phone) {
      return NextResponse.json(
        { error: 'Укажите имя и телефон' },
        { status: 400 }
      );
    }

    const order = await createOrder({
      name: name || '',
      phone: phone || '',
      email,
      siteUrl,
      violations,
      totalMaxFine,
      productType,
      checkResult,
    });

    console.log(`[ORDER] ${productType || 'fix'}: ${order.email || order.name}, сайт: ${order.siteUrl}`);

    // Send emails (fire-and-forget, don't block response)
    if (productType === 'email-lead' && email) {
      (async () => {
        try {
          // Generate PDF report if checkResult is available
          let pdfBuffer: Buffer | undefined;
          if (checkResult) {
            pdfBuffer = await generateReport(checkResult, { mode: 'outbound', visibleCount: 3 });
          }
          const domain = siteUrl ? extractDomain(siteUrl) : undefined;
          await sendEmailGateReport(email, {
            total: violations || 0,
            totalMaxFine: totalMaxFine || 0,
            siteUrl: siteUrl || '',
            pdfBuffer,
            domain,
          });
          console.log(`[ORDER] Email-gate + PDF sent to ${email}`);
        } catch (err) {
          console.error('[ORDER] Email-gate send failed:', err);
        }
      })();
    }

    // Notify admin about new leads/orders
    if (email || phone) {
      sendAdminNotification({
        orderId: order.id,
        name: name || '',
        email: email || '',
        phone: phone || '',
        productType: productType || 'fix',
        siteUrl: siteUrl || '',
        violations: violations || 0,
        totalMaxFine: totalMaxFine || 0,
      }).catch(err => console.error('[ORDER] Admin notification failed:', err));
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch {
    return NextResponse.json(
      { error: 'Ошибка при обработке заявки' },
      { status: 500 }
    );
  }
}
