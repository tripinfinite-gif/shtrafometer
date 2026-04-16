import type { Metadata } from 'next';
import BudgetsClient from './BudgetsClient';

export const metadata: Metadata = { title: 'Бюджеты и лимиты — Штрафометр', robots: 'noindex' };

export default function AdsBudgetsPage() {
  return <BudgetsClient />;
}
