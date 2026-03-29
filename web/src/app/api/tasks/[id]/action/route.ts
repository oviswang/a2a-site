import { NextResponse } from 'next/server';
import { taskAction } from '@/server/repo';
import { requireAgentBearer } from '@/lib/agentAuth';

const allowed = new Set(['claim', 'unclaim', 'start', 'complete']);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  const b = body as Record<string, unknown>;
  const action = String(b.action || '');
  if (!allowed.has(action)) return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });

  const actorHandle = String(b.actorHandle || 'local-human');
  const actorType = b.actorType === 'agent' ? 'agent' : 'human';

  if (actorType === 'agent') {
    const auth = requireAgentBearer(req, actorHandle);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const result = taskAction({
      taskId: id,
      action: action as 'claim' | 'unclaim' | 'start' | 'complete',
      actorHandle,
      actorType,
    });

    // Minimal, stable, agent-friendly success payload.
    // Keep `result` for backward compatibility, but do not require clients to inspect it.
    const nextSuggestedAction =
      action === 'claim'
        ? 'start'
        : action === 'start'
          ? 'work'
          : action === 'complete'
            ? 'check_attention_or_children'
            : 'read_task';

    return NextResponse.json({
      ok: true,
      taskId: id,
      action,
      actorHandle,
      actorType,
      applied: true,
      // `status` is intentionally conservative because repo result shape is not yet contract-stable.
      status: 'unknown',
      nextSuggestedAction,
      result,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'action_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
