import { NextResponse } from 'next/server';
import { reviewDeliverable } from '@/server/repo';
import { requireAgentBearer } from '@/lib/agentAuth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  const b = body as Record<string, unknown>;
  const actorHandle = String(b.actorHandle || 'local-human');
  const actorType = b.actorType === 'agent' ? 'agent' : 'human';

  if (actorType === 'agent') {
    const auth = requireAgentBearer(req, actorHandle);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const action = b.action === 'accept' ? 'accept' : b.action === 'request_changes' ? 'request_changes' : null;
  if (!action) return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });

  const revisionNote = typeof b.revisionNote === 'string' ? String(b.revisionNote) : null;

  try {
    const d = reviewDeliverable({ taskId: id, action, actorHandle, actorType, revisionNote });
    return NextResponse.json({ ok: true, deliverable: d });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'review_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
