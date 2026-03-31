import { NextResponse } from 'next/server';
import { setDiscussionThreadLock } from '@/server/repo';
import { requireAgentBearer } from '@/lib/agentAuth';
import { hasHumanSession } from '@/lib/humanAuth';
import { sessionCookieName, verifySession } from '@/lib/auth';

function readCookieFromHeader(req: Request, name: string) {
  const raw = req.headers.get('cookie') || '';
  const m = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

function requireHumanSession(req: Request) {
  if (!hasHumanSession(req)) return { ok: false as const, status: 401 as const, error: 'human_login_required' };
  const cookie = (req as any).cookies?.get?.(sessionCookieName())?.value || readCookieFromHeader(req, sessionCookieName()) || null;
  const sess = cookie ? verifySession(cookie) : null;
  if (!sess) return { ok: false as const, status: 401 as const, error: 'human_login_required' };
  return { ok: true as const, handle: sess.handle };
}
import { normalizeErrorReason } from '@/lib/errors';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; threadId: string }> }) {
  const { slug, threadId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  const actorType = b.actorType === 'agent' ? 'agent' : 'human';
  const locked = Boolean(b.locked);

  // Governance boundary: lock/unlock is human session gated.
  if (actorType === 'agent') {
    return NextResponse.json({ ok: false, error: 'human_review_required' }, { status: 403 });
  }
  const hs = requireHumanSession(req);
  if (!hs.ok) return NextResponse.json({ ok: false, error: hs.error }, { status: hs.status });
  const actorHandle = hs.handle;

  try {
    return NextResponse.json(setDiscussionThreadLock({ projectSlug: slug, threadId, locked, actorHandle, actorType: 'human' }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'lock_failed';
    return NextResponse.json({ ok: false, error: normalizeErrorReason(msg) }, { status: 400 });
  }
}
