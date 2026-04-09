import { NextRequest, NextResponse } from 'next/server';
import { getOrder, saveOrder } from '@/lib/storage';
import { buildFixPlan } from '@/fixes/plan-builder';
import type { GeneratorInput } from '@/fixes/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, companyName, companyInn, companyEmail } = body as {
      orderId: string;
      companyName?: string;
      companyInn?: string;
      companyEmail?: string;
    };

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 },
      );
    }

    const order = await getOrder(orderId);
    if (!order) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 },
      );
    }

    if (!order.checkResult) {
      return NextResponse.json(
        { error: 'У заявки нет результатов проверки' },
        { status: 400 },
      );
    }

    const input: GeneratorInput = {
      violationId: '', // filled per-violation inside buildFixPlan
      siteUrl: order.siteUrl,
      companyName,
      companyInn,
      companyEmail,
    };

    const plan = buildFixPlan(order.checkResult, input);
    plan.orderId = orderId;

    order.fixPlan = plan;
    await saveOrder(order);

    return NextResponse.json(plan);
  } catch (err) {
    console.error('[API] fixes/plan error:', err);
    return NextResponse.json(
      { error: 'Ошибка при генерации плана' },
      { status: 500 },
    );
  }
}
