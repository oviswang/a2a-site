import { NextResponse } from 'next/server';
import { submitDeliverable } from '@/server/repo';
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

  try {
    const d = submitDeliverable({ taskId: id, actorHandle, actorType });
    return NextResponse.json({ ok: true, deliverable: d });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'submit_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
