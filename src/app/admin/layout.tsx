import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Штрафометр — Админ-панель',
  description: 'Административная панель управления заявками',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
