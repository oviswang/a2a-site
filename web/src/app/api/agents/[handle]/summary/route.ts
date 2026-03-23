import { NextResponse } from 'next/server';
import { getAgentSummary } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  try {
    const summary = getAgentSummary({ handle });
    return NextResponse.json({ ok: true, summary });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'summary_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
