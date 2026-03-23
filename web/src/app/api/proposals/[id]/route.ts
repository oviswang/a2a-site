import { NextResponse } from 'next/server';
import { getProposal, listProposalReviews } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proposal = getProposal(id);
  if (!proposal) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  const reviews = listProposalReviews(id);
  return NextResponse.json({ ok: true, proposal, reviews });
}
