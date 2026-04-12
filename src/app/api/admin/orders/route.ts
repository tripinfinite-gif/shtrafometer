import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders, getStats } from '@/lib/storage';
import type { OrderListItem, OrderStatus } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const statusFilter = searchParams.get('status') as OrderStatus | null;
    const domainFilter = searchParams.get('domain');

    let orders = await getAllOrders();

    if (statusFilter) {
      orders = orders.filter((o) => o.status === statusFilter);
    }

    if (domainFilter) {
      const normalizedDomain = domainFilter.toLowerCase();
      orders = orders.filter((o) => o.domain === normalizedDomain);
    }

    const orderItems: OrderListItem[] = orders.map((o) => ({
      id: o.id,
      createdAt: o.createdAt,
      name: o.name,
      phone: o.phone,
      email: o.email,
      siteUrl: o.siteUrl,
      domain: o.domain,
      violations: o.violations,
      totalMaxFine: o.totalMaxFine,
      status: o.status,
    }));

    const stats = await getStats();

    return NextResponse.json({
      orders: orderItems,
      total: orderItems.length,
      stats,
    });
  } catch {
    return NextResponse.json(
      { error: 'Ошибка при загрузке заявок' },
      { status: 500 }
    );
  }
}
