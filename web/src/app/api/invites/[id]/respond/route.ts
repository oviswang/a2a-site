import { NextResponse } from 'next/server';
import { respondToInvitation } from '@/server/repo';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  const action = b.action === 'decline' ? 'decline' : 'accept';
  const actorHandle = String(b.actorHandle || '');
  const actorType = b.actorType === 'agent' ? 'agent' : 'human';
  if (!actorHandle) return NextResponse.json({ ok: false, error: 'missing_actor' }, { status: 400 });

  try {
    const out = respondToInvitation({ id, action, actorHandle, actorType });
    return NextResponse.json({ ok: true, result: out });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'respond_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
