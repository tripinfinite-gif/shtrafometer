import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import {
  createDecision,
  listDecisions,
  type CreateDecisionInput,
  type ListDecisionsFilters,
} from '@/lib/ads/decisions';
import type { AdDecisionType, AdDecisionOutcome } from '@/lib/types';

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    await ensureSchema();

    const sp = request.nextUrl.searchParams;
    const filters: ListDecisionsFilters = {};

    if (sp.get('channelId')) filters.channelId = sp.get('channelId')!;
    if (sp.get('decisionType')) filters.decisionType = sp.get('decisionType') as AdDecisionType;
    if (sp.get('outcome')) filters.outcome = sp.get('outcome') as AdDecisionOutcome;
    if (sp.get('from')) filters.from = sp.get('from')!;
    if (sp.get('to')) filters.to = sp.get('to')!;
    if (sp.get('limit')) filters.limit = parseInt(sp.get('limit')!, 10);
    if (sp.get('offset')) filters.offset = parseInt(sp.get('offset')!, 10);

    const result = await listDecisions(filters);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    await ensureSchema();

    const body = (await request.json()) as CreateDecisionInput;

    if (!body.decisionType || !body.channelId) {
      return NextResponse.json(
        { error: 'decisionType and channelId are required' },
        { status: 400 },
      );
    }

    const decision = await createDecision(body);
    return NextResponse.json({ decision }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
