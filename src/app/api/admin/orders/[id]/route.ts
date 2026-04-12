import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrderStatus, updateOrderNotes } from '@/lib/storage';
import type { OrderStatus } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getOrder(id);

    if (!order) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch {
    return NextResponse.json(
      { error: 'Ошибка при загрузке заявки' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body as { status?: OrderStatus; notes?: string };

    // Verify order exists
    const existing = await getOrder(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      );
    }

    let updated = existing;

    if (status) {
      const result = await updateOrderStatus(id, status);
      if (result) updated = result;
    }

    if (notes !== undefined) {
      const result = await updateOrderNotes(id, notes);
      if (result) updated = result;
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: 'Ошибка при обновлении заявки' },
      { status: 500 }
    );
  }
}
