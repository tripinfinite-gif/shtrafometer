import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/storage';

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

    return NextResponse.json({ success: true, orderId: order.id });
  } catch {
    return NextResponse.json(
      { error: 'Ошибка при обработке заявки' },
      { status: 500 }
    );
  }
}
