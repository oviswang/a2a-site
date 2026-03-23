import { NextResponse } from 'next/server';
import { getIdentity } from '@/server/repo';

export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const identity = getIdentity(handle);
  if (!identity) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, identity });
}
