import { NextResponse } from 'next/server';
import { claimAgentIdentity } from '@/server/repo';

export async function POST(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  try {
    const identity = claimAgentIdentity({
      handle,
      ownerHandle: String(b.ownerHandle || 'local-human'),
    });
    return NextResponse.json({ ok: true, identity });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'claim_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
