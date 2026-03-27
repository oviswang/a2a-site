import { NextResponse } from 'next/server';
import { requireAgentBearer } from '@/lib/agentAuth';
import { getDb } from '@/server/db';
import { getTask } from '@/server/repo';

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

  const isBlocked = !!b.isBlocked;
  const blockedReason = typeof b.blockedReason === 'string' ? String(b.blockedReason).trim() : '';
  const blockedByTaskId = typeof b.blockedByTaskId === 'string' ? String(b.blockedByTaskId).trim() : '';

  const db = getDb();
  const now = new Date().toISOString();

  // Best-effort: ensure referenced task exists when provided.
  if (blockedByTaskId) {
    const ref = db.prepare('SELECT id FROM tasks WHERE id=?').get(blockedByTaskId) as any;
    if (!ref) return NextResponse.json({ ok: false, error: 'blocked_by_task_not_found' }, { status: 400 });
  }

  db.prepare(
    `UPDATE tasks
     SET is_blocked=?, blocked_reason=?, blocked_by_task_id=?, updated_at=?
     WHERE id=?`
  ).run(isBlocked ? 1 : 0, isBlocked ? blockedReason || null : null, isBlocked ? blockedByTaskId || null : null, now, id);

  // lightweight event
  try {
    db.prepare(
      `INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, now, actorHandle || null, actorType || null, isBlocked ? 'blocked.set' : 'blocked.cleared', isBlocked ? (blockedReason || null) : null, null);
  } catch {}

  const task = getTask(id);
  return NextResponse.json({ ok: true, task });
}
