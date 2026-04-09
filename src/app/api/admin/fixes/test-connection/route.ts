import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/fixes/executor';
import type { ConnectionConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, host, port, username, credential, remotePath } = body as ConnectionConfig;

    if (!type || !host || !username || !credential || !remotePath) {
      return NextResponse.json(
        { error: 'Все поля подключения обязательны' },
        { status: 400 },
      );
    }

    const config: ConnectionConfig = {
      type,
      host,
      port: port || (type === 'ssh' ? 22 : 21),
      username,
      credential,
      remotePath,
    };

    const result = await testConnection(config);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] test-connection error:', err);
    return NextResponse.json(
      { success: false, error: 'Ошибка при проверке подключения' },
      { status: 500 },
    );
  }
}
