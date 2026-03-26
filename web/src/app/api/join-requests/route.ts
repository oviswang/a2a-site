import { NextResponse } from 'next/server';
import { listJoinRequestsForApprover } from '@/server/repo';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const approverHandle = url.searchParams.get('approverHandle') || '';
  if (!approverHandle) return NextResponse.json({ ok: false, error: 'missing_approver' }, { status: 400 });

  try {
    const requests = listJoinRequestsForApprover({ approverHandle });
    return NextResponse.json({ ok: true, requests });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'list_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
