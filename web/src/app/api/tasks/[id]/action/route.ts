import { NextResponse } from 'next/server';
import { taskAction } from '@/server/repo';

const allowed = new Set(['claim', 'unclaim', 'start', 'complete']);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  const b = body as Record<string, unknown>;
  const action = String(b.action || '');
  if (!allowed.has(action)) return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });

  try {
    const result = taskAction({
      taskId: id,
      action: action as 'claim' | 'unclaim' | 'start' | 'complete',
      actorHandle: String(b.actorHandle || 'local-human'),
      actorType: b.actorType === 'agent' ? 'agent' : 'human',
    });

    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'action_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
