import { NextResponse } from 'next/server';
import { proposalAction } from '@/server/repo';

const allowed = new Set(['approve', 'request_changes', 'reject', 'merge']);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  const b = body as Record<string, unknown>;
  const action = String(b.action || '');
  if (!allowed.has(action)) return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });

  try {
    const proposal = proposalAction({
      id,
      action: action as 'approve' | 'request_changes' | 'reject' | 'merge',
      actorHandle: b.actorHandle ? String(b.actorHandle) : undefined,
      actorType: b.actorType === 'agent' ? 'agent' : 'human',
      note: b.note ? String(b.note) : undefined,
    });

    return NextResponse.json({ ok: true, proposal });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'action_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
