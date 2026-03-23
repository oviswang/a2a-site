import { NextResponse } from 'next/server';
import { getAgentSummary } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const summary = getAgentSummary({ handle });
  return NextResponse.json({ ok: true, summary });
}
