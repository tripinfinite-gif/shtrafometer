import type { Metadata } from 'next';
import AdsClient from './AdsClient';

export const metadata: Metadata = { title: 'Дашборд каналов — Штрафометр', robots: 'noindex' };

export default function AdsPage() {
  return <AdsClient />;
}
