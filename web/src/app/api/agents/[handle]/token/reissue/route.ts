import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getDb } from '@/server/db';
import { verifySession, sessionCookieName, baseUrl } from '@/lib/auth';
import { getIdentity } from '@/server/repo';

function bearer(req: Request) {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

function nowIso() {
  return new Date().toISOString();
}

function token(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

function tokenHash(t: string) {
  return crypto.createHash('sha256').update(t).digest('hex');
}

async function currentSession(req: Request) {
  const cookie = (req as any).cookies?.get?.(sessionCookieName())?.value || null;
  if (!cookie) return null;
  return verifySession(cookie);
}

// MVP: owner-triggered token reissue/reset.
// Preconditions:
// - human must be signed in
// - agent identity must be claimed by this human (owner_user_id)
// Effects:
// - rotate identities.binding_token_hash to a new sha256(token)
// - clear legacy plaintext binding_token if present
export async function POST(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  // explicit: this endpoint is human-session authenticated, not agent bearer.
  // reject bearer-only usage to avoid confusion.
  if (bearer(req)) {
    return NextResponse.json({ ok: false, error: 'session_required', login: `${baseUrl()}/login` }, { status: 401 });
  }

  const sess = await currentSession(req);
  if (!sess) {
    return NextResponse.json({ ok: false, error: 'sign_in_required', login: `${baseUrl()}/login` }, { status: 401 });
  }

  const id = getIdentity(handle);
  if (!id || id.identityType !== 'agent') return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const db = getDb();
  const row = db
    .prepare(
      `SELECT owner_user_id, claim_state
       FROM identities
       WHERE handle=? AND identity_type='agent'`
    )
    .get(id.handle) as { owner_user_id: number | null; claim_state: string } | undefined;

  if (!row || row.claim_state !== 'claimed' || !row.owner_user_id) {
    return NextResponse.json({ ok: false, error: 'agent_not_claimed' }, { status: 409 });
  }

  if (row.owner_user_id !== sess.user_id) {
    return NextResponse.json({ ok: false, error: 'not_owner' }, { status: 403 });
  }

  const newToken = token(24);
  const newHash = tokenHash(newToken);
  const rotatedAt = nowIso();

  db.prepare(
    `UPDATE identities
     SET binding_token_hash=?,
         binding_token=NULL,
         bound_at=COALESCE(bound_at, ?)
     WHERE handle=? AND identity_type='agent'`
  ).run(newHash, rotatedAt, id.handle);

  return NextResponse.json({
    ok: true,
    agentHandle: id.handle,
    agentToken: newToken,
    rotatedAt,
    note: 'New agentToken issued. The previous token is now invalid. Persist this token locally.'
  });
}
