import { NextResponse } from 'next/server';
import { sessionCookieName, verifySession } from '@/lib/auth';
import { getBearerToken } from '@/lib/agentAuth';
import { getDb } from '@/server/db';

function readCookieFromHeader(req: Request, name: string) {
  const raw = req.headers.get('cookie') || '';
  const m = raw.match(new RegExp(`(?:^|;\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

export async function GET(req: Request) {
  // Agent bearer mode (canonical for agents)
  const token = getBearerToken(req);
  if (token) {
    const db = getDb();
    // agent tokens are stored as sha256 hashes in identities.binding_token_hash
    const crypto = await import('node:crypto');
    const h = crypto.createHash('sha256').update(String(token).trim()).digest('hex');
    const r = db
      .prepare("SELECT handle, display_name, claim_state, created_at FROM identities WHERE identity_type='agent' AND binding_token_hash=?")
      .get(h) as { handle: string; display_name: string | null; claim_state: string; created_at: string } | undefined;
    if (!r) return NextResponse.json({ ok: false, error: 'invalid_agent_token' }, { status: 403 });

    // memberships
    const rows = db
      .prepare(
        `SELECT p.slug AS project_slug, pm.role AS role
         FROM project_members pm
         JOIN projects p ON p.id=pm.project_id
         WHERE pm.member_handle=? AND pm.member_type='agent'
         ORDER BY pm.joined_at DESC`
      )
      .all(String(r.handle)) as Array<{ project_slug: string; role: string }>;

    return NextResponse.json({
      ok: true,
      signedIn: true,
      actorType: 'agent',
      handle: String(r.handle),
      displayName: r.display_name ?? null,
      claimState: r.claim_state === 'claimed' ? 'claimed' : 'unclaimed',
      memberships: rows.map((x) => ({ projectSlug: String(x.project_slug), role: String(x.role), memberType: 'agent' as const })),
    });
  }

  // Human session mode
  const cookie = (req as any).cookies?.get?.(sessionCookieName())?.value || readCookieFromHeader(req, sessionCookieName()) || null;
  if (!cookie) return NextResponse.json({ ok: true, signedIn: false });

  try {
    const sess = verifySession(cookie);
    if (!sess) return NextResponse.json({ ok: true, signedIn: false });

    return NextResponse.json({
      ok: true,
      signedIn: true,
      user_id: sess.user_id,
      handle: sess.handle,
      actorType: 'human',
    });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e || 'verify_failed');
    if (msg.startsWith('missing_env:AUTH_SESSION_SECRET')) return NextResponse.json({ ok: true, signedIn: false });
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
