import type { Metadata } from 'next';
import AlertsClient from './AlertsClient';

export const metadata: Metadata = { title: 'Алерты — Штрафометр', robots: 'noindex' };

export default function AdsAlertsPage() {
  return <AlertsClient />;
}
