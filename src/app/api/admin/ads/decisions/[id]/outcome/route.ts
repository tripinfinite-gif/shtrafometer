import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import { updateOutcome, getDecisionById } from '@/lib/ads/decisions';
import type { AdDecisionOutcome } from '@/lib/types';

const VALID_OUTCOMES: AdDecisionOutcome[] = [
  'pending',
  'positive',
  'negative',
  'neutral',
  'inconclusive',
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    await ensureSchema();

    const { id } = await params;
    const body = (await request.json()) as {
      outcome: AdDecisionOutcome;
      comment?: string;
    };

    if (!body.outcome || !VALID_OUTCOMES.includes(body.outcome)) {
      return NextResponse.json(
        { error: `outcome must be one of: ${VALID_OUTCOMES.join(', ')}` },
        { status: 400 },
      );
    }

    // Check existence
    const existing = await getDecisionById(id);
    if (!existing) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    await updateOutcome(id, body.outcome, body.comment ?? null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
