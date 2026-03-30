import { NextResponse } from 'next/server';
import { getBearerToken, requireAgentBearer } from '@/lib/agentAuth';
import { getDb } from '@/server/db';

const ALLOWED_TARGET_TYPES = new Set(['task', 'proposal', 'deliverable', 'discussion_thread']);
const ALLOWED_INTENTS = new Set(['reviewing', 'drafting', 'replying', 'working', 'preparing_submit']);

// Minimal intent marker (soft signal) for multi-agent coordination.
// - Not a lock.
// - Best-effort.
// - Agent-bearer only.
export async function POST(req: Request) {
  const bearer = getBearerToken(req);
  if (!bearer) return NextResponse.json({ ok: false, error: 'missing_bearer' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  const actorHandle = String(b.actorHandle || '').trim();
  const actorType = b.actorType === 'agent' ? 'agent' : 'human';
  if (actorType !== 'agent' || !actorHandle) return NextResponse.json({ ok: false, error: 'missing_actor' }, { status: 400 });

  const auth = requireAgentBearer(req, actorHandle);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const targetType = String(b.targetType || '').trim();
  const targetId = String(b.targetId || '').trim();
  const intent = String(b.intent || '').trim();
  if (!ALLOWED_TARGET_TYPES.has(targetType)) return NextResponse.json({ ok: false, error: 'invalid_target_type' }, { status: 400 });
  if (!targetId) return NextResponse.json({ ok: false, error: 'missing_target_id' }, { status: 400 });
  if (!ALLOWED_INTENTS.has(intent)) return NextResponse.json({ ok: false, error: 'invalid_intent' }, { status: 400 });

  const note = b.note ? String(b.note) : null;

  const db = getDb();
  const now = new Date().toISOString();
  const payload = {
    kind: 'intent.marker',
    ts: now,
    actorHandle,
    actorType: 'agent',
    targetType,
    targetId,
    intent,
    note,
  };

  db.prepare('INSERT INTO audit_events (ts, kind, payload_json) VALUES (?, ?, ?)').run(now, 'intent.marker', JSON.stringify(payload));

  return NextResponse.json({ ok: true, marker: payload });
}
