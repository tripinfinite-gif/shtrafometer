import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, USER_SESSION_COOKIE_NAME } from '@/lib/user-auth';
import { query } from '@/lib/db';

// GET /api/cabinet/me — current user profile
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      companyName: user.companyName,
      companyInn: user.companyInn,
    },
  });
}

// PUT /api/cabinet/me — update user profile
export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string; email?: string | null; companyName?: string | null; companyInn?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const name = body.name?.trim()?.slice(0, 100);
  if (!name) {
    return NextResponse.json({ error: 'Имя не может быть пустым' }, { status: 400 });
  }

  // Validate email if provided
  const email = body.email?.trim()?.slice(0, 200) || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Некорректный email' }, { status: 400 });
  }

  const companyName = body.companyName?.trim()?.slice(0, 200) || null;
  const companyInn = body.companyInn?.replace(/\D/g, '')?.slice(0, 12) || null;

  // Validate INN if provided (10 or 12 digits)
  if (companyInn && companyInn.length !== 10 && companyInn.length !== 12) {
    return NextResponse.json({ error: 'ИНН должен содержать 10 или 12 цифр' }, { status: 400 });
  }

  await query(
    `UPDATE users SET name = $1, email = $2, company_name = $3, company_inn = $4 WHERE id = $5`,
    [name, email, companyName, companyInn, user.id],
  );

  return NextResponse.json({
    user: {
      id: user.id,
      name,
      phone: user.phone,
      email,
      companyName,
      companyInn,
    },
  });
}
