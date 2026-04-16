import type { Metadata } from 'next';
import AiConsultantShell from './AiConsultantShell';
import ConnectionsBanner from './ConnectionsBanner';

export const metadata: Metadata = {
  title: 'AI-консультант — Штрафометр',
  robots: 'noindex',
};

export const dynamic = 'force-dynamic';

export default function AiConsultantPage() {
  return <AiConsultantShell connectionsSlot={<ConnectionsBanner />} />;
}
