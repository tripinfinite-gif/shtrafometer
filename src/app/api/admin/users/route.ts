import { NextRequest, NextResponse } from 'next/server';
import { getDomainHistories, getOrdersByDomain } from '@/lib/storage';
import type { DomainHistory, DomainCheck } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const domainFilter = searchParams.get('domain');

    if (domainFilter) {
      const orders = await getOrdersByDomain(domainFilter);

      if (orders.length === 0) {
        return NextResponse.json({ domains: [] });
      }

      const checks: DomainCheck[] = orders.map((o) => ({
        orderId: o.id,
        checkedAt: o.createdAt,
        name: o.name,
        email: o.email,
        phone: o.phone,
        violations: o.violations,
        totalMaxFine: o.totalMaxFine,
        status: o.status,
      }));

      const history: DomainHistory = {
        domain: domainFilter.toLowerCase(),
        checks,
        lastCheckedAt: orders[0].createdAt,
        totalOrders: orders.length,
      };

      return NextResponse.json({ domains: [history] });
    }

    const domains = await getDomainHistories();
    return NextResponse.json({ domains });
  } catch {
    return NextResponse.json(
      { error: 'Ошибка при загрузке данных' },
      { status: 500 }
    );
  }
}
