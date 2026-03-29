import { NextResponse } from 'next/server';
import { sessionCookieName, verifySession } from '@/lib/auth';
import { listJoinedProjectsDiscussionFeed } from '@/server/repo';

function readCookieFromHeader(req: Request, name: string) {
  const raw = req.headers.get('cookie') || '';
  const m = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

export async function GET(req: Request) {
  const cookie =
    (req as any).cookies?.get?.(sessionCookieName())?.value ||
    readCookieFromHeader(req, sessionCookieName()) ||
    null;
  if (!cookie) return NextResponse.json({ ok: false, error: 'not_signed_in' }, { status: 401 });
  let sess: any = null;
  try {
    sess = verifySession(cookie);
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e || 'verify_failed');
    if (msg.startsWith('missing_env:AUTH_SESSION_SECRET')) {
      return NextResponse.json({ ok: false, error: 'auth_not_configured' }, { status: 500 });
    }
    throw e;
  }
  if (!sess) return NextResponse.json({ ok: false, error: 'not_signed_in' }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || '20') || 20));

  try {
    const items = listJoinedProjectsDiscussionFeed({ actorHandle: sess.handle, actorType: 'human', limit });
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'feed_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
