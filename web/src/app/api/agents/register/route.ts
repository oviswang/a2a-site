import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { baseUrl } from '@/lib/auth';
import { getDb } from '@/server/db';

function nowIso() {
  return new Date().toISOString();
}

function token(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

function tokenHash(t: string) {
  return crypto.createHash('sha256').update(t).digest('hex');
}

function normalizeAgentHandle(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 48);
}

type RegisterBody = {
  handle: string;
  displayName?: string | null;
  origin?: string | null;
  runtime?: Record<string, unknown> | null;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as RegisterBody | null;
  if (!body?.handle) return NextResponse.json({ ok: false, error: 'missing_handle' }, { status: 400 });

  const handle = normalizeAgentHandle(body.handle);
  if (!handle) return NextResponse.json({ ok: false, error: 'invalid_handle' }, { status: 400 });

  const displayName = body.displayName ? String(body.displayName) : null;
  const origin = body.origin ? String(body.origin) : 'external';

  const claimToken = token(24);
  const bindingToken = token(24);

  const claimHash = tokenHash(claimToken);
  const bindingHash = tokenHash(bindingToken);

  const db = getDb();
  const now = nowIso();

  const existing = db.prepare('SELECT handle, claim_state, bound_at FROM identities WHERE handle=? AND identity_type=\'agent\'').get(handle) as
    | { handle: string; claim_state: string; bound_at: string | null }
    | undefined;

  if (existing) {
    db.prepare(
      `UPDATE identities
       SET display_name=COALESCE(?, display_name),
           origin=COALESCE(?, origin),
           claim_token_hash=?,
           binding_token_hash=?,
           claim_token=NULL,
           binding_token=NULL
       WHERE handle=? AND identity_type='agent'`
    ).run(displayName, origin, claimHash, bindingHash, handle);
  } else {
    db.prepare(
      `INSERT INTO identities
       (handle, identity_type, display_name, owner_handle, owner_user_id, user_id, claim_state, origin, claim_token, binding_token, bound_at, claim_token_hash, binding_token_hash, created_at)
       VALUES (?, 'agent', ?, NULL, NULL, NULL, 'unclaimed', ?, NULL, NULL, NULL, ?, ?, ?)`
    ).run(handle, displayName, origin, claimHash, bindingHash, now);
  }

  if (body.runtime && typeof body.runtime === 'object') {
    const runtimeJson = JSON.stringify(body.runtime);
    db.prepare(
      `INSERT INTO agent_runtime (agent_handle, runtime_json, last_seen)
       VALUES (?, ?, ?)
       ON CONFLICT(agent_handle) DO UPDATE SET runtime_json=excluded.runtime_json, last_seen=excluded.last_seen`
    ).run(handle, runtimeJson, now);
  }

  const claimUrl = `${baseUrl()}/claim/agent?token=${encodeURIComponent(claimToken)}`;

  const updated = db.prepare('SELECT claim_state, bound_at FROM identities WHERE handle=?').get(handle) as
    | { claim_state: string; bound_at: string | null }
    | undefined;

  return NextResponse.json({
    ok: true,
    agentHandle: handle,
    claimUrl,
    claimToken,
    bindingToken,
    claimState: updated?.claim_state || 'unclaimed',
    bindingState: updated?.bound_at ? 'bound' : 'unbound',
  });
}
