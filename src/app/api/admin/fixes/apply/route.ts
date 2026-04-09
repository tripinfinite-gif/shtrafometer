import { NextRequest, NextResponse } from 'next/server';
import { getOrder, saveOrder } from '@/lib/storage';
import { executeFixes } from '@/fixes/executor';
import type { ConnectionConfig, FixPlan } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, connection, fixIds } = body as {
      orderId: string;
      connection: ConnectionConfig;
      fixIds?: string[];
    };

    if (!orderId || !connection) {
      return NextResponse.json(
        { error: 'orderId and connection are required' },
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

    if (!order.fixPlan) {
      return NextResponse.json(
        { error: 'План фиксов не найден' },
        { status: 400 },
      );
    }

    // If fixIds provided, mark non-selected fixes as skipped
    let plan: FixPlan;
    if (fixIds && fixIds.length > 0) {
      plan = {
        ...order.fixPlan,
        fixes: order.fixPlan.fixes.map((fix) => ({
          ...fix,
          status: fixIds.includes(fix.id)
            ? fix.status === 'skipped'
              ? 'pending' as const
              : fix.status
            : 'skipped' as const,
        })),
      };
    } else {
      plan = order.fixPlan;
    }

    const report = await executeFixes(plan, connection);

    // Update order with the modified plan (statuses updated by executor)
    order.fixPlan = plan;
    await saveOrder(order);

    return NextResponse.json(report);
  } catch (err) {
    console.error('[API] fixes/apply error:', err);
    return NextResponse.json(
      { error: 'Ошибка при применении фиксов' },
      { status: 500 },
    );
  }
}
