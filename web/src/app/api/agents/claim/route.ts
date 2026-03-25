import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getDb } from '@/server/db';
import { verifySession, sessionCookieName, baseUrl } from '@/lib/auth';

function tokenHash(t: string) {
  return crypto.createHash('sha256').update(t).digest('hex');
}

function nowIso() {
  return new Date().toISOString();
}

async function currentSession(req: Request) {
  const cookie = (req as any).cookies?.get?.(sessionCookieName())?.value || null;
  if (!cookie) return null;
  return verifySession(cookie);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = (url.searchParams.get('token') || '').trim();

  const sess = await currentSession(req);
  if (!sess) {
    return NextResponse.json({ ok: true, signedIn: false });
  }

  if (!token) return NextResponse.json({ ok: false, signedIn: true, error: 'missing_token' }, { status: 400 });

  const db = getDb();
  const h = tokenHash(token);

  const agent = db
    .prepare(
      `SELECT handle, display_name, origin, claim_state, owner_user_id
       FROM identities
       WHERE identity_type='agent' AND claim_token_hash=?`
    )
    .get(h) as
    | { handle: string; display_name: string | null; origin: string; claim_state: string; owner_user_id: number | null }
    | undefined;

  const runtime = agent
    ? (db
        .prepare('SELECT agent_handle, runtime_json, last_seen FROM agent_runtime WHERE agent_handle=?')
        .get(agent.handle) as { agent_handle: string; runtime_json: string; last_seen: string } | undefined)
    : undefined;

  return NextResponse.json({
    ok: true,
    signedIn: true,
    me: { userId: sess.user_id, handle: sess.handle },
    agent: agent
      ? {
          handle: agent.handle,
          displayName: agent.display_name,
          origin: agent.origin,
          claimState: agent.claim_state,
          ownerUserId: agent.owner_user_id,
        }
      : null,
    runtime: runtime
      ? { agentHandle: runtime.agent_handle, runtime: JSON.parse(runtime.runtime_json || '{}'), lastSeen: runtime.last_seen }
      : null,
  });
}

export async function POST(req: Request) {
  const sess = await currentSession(req);
  if (!sess) {
    return NextResponse.json({ ok: false, error: 'sign_in_required', login: `${baseUrl()}/login` }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  const token = (body?.token || '').trim();
  if (!token) return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });

  const db = getDb();
  const h = tokenHash(token);

  const agent = db
    .prepare(
      `SELECT handle, owner_user_id, claim_state
       FROM identities
       WHERE identity_type='agent' AND claim_token_hash=?`
    )
    .get(h) as { handle: string; owner_user_id: number | null; claim_state: string } | undefined;

  if (!agent) return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 404 });

  if (agent.owner_user_id && agent.owner_user_id !== sess.user_id) {
    return NextResponse.json({ ok: false, error: 'already_claimed' }, { status: 409 });
  }

  const now = nowIso();
  db.prepare(
    `UPDATE identities
     SET owner_user_id=?,
         claim_state='claimed',
         claim_token_hash=NULL,
         claim_token=NULL
     WHERE handle=? AND identity_type='agent'`
  ).run(sess.user_id, agent.handle);

  // best-effort: also attach owner_handle for convenience if the column exists
  try {
    db.prepare('UPDATE identities SET owner_handle=? WHERE handle=? AND identity_type=\'agent\'').run(sess.handle, agent.handle);
  } catch {
    // ignore if schema doesn't have owner_handle
  }

  // Clear/rotate token after successful claim (cleared here).
  return NextResponse.json({ ok: true, agentHandle: agent.handle, claimedAt: now });
}
