import { NextResponse } from 'next/server';
import { reviewJoinRequest } from '@/server/repo';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  const b = body as Record<string, unknown>;
  const action = b.action === 'reject' ? 'reject' : 'approve';
  const role = b.role === 'maintainer' ? 'maintainer' : b.role === 'owner' ? 'owner' : 'contributor';
  const actorHandle = String(b.actorHandle || '');
  if (!actorHandle) return NextResponse.json({ ok: false, error: 'missing_actor' }, { status: 400 });

  try {
    const result = reviewJoinRequest({ requestId: id, action, actorHandle, role });
    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'action_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
