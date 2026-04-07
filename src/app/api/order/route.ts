import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, siteUrl, violations, totalMaxFine } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Укажите имя и телефон" },
        { status: 400 }
      );
    }

    const order = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: email ? String(email).trim() : "",
      siteUrl: siteUrl || "",
      violations: violations || 0,
      totalMaxFine: totalMaxFine || 0,
      price: 9900,
      status: "new",
    };

    // Save to local JSON file (for MVP without database)
    const ordersDir = join(process.cwd(), "orders");
    await mkdir(ordersDir, { recursive: true });
    const filePath = join(ordersDir, `${order.id}.json`);
    await writeFile(filePath, JSON.stringify(order, null, 2), "utf-8");

    console.log(`[ORDER] Новая заявка: ${order.name}, ${order.phone}, сайт: ${order.siteUrl}`);

    return NextResponse.json({ success: true, orderId: order.id });
  } catch {
    return NextResponse.json(
      { error: "Ошибка при обработке заявки" },
      { status: 500 }
    );
  }
}
