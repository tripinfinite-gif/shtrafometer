import { NextRequest, NextResponse } from 'next/server';
import { analyzeUrl } from '@/checks/engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Укажите URL сайта для проверки' },
        { status: 400 }
      );
    }

    // Базовая валидация URL
    const trimmed = url.trim();
    if (trimmed.length < 3 || trimmed.length > 2000) {
      return NextResponse.json(
        { error: 'Некорректный URL' },
        { status: 400 }
      );
    }

    const result = await analyzeUrl(trimmed);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      // Ошибка загрузки сайта — возвращаем 422
      if (
        error.message.includes('загрузить') ||
        error.message.includes('fetch') ||
        error.message.includes('abort')
      ) {
        return NextResponse.json(
          { error: 'Не удалось загрузить сайт. Проверьте URL и попробуйте снова.' },
          { status: 422 }
        );
      }
    }
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
