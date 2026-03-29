import { NextResponse } from 'next/server';
import { searchAll } from '@/server/repo';
import { sessionCookieName, verifySession } from '@/lib/auth';

function readCookieFromHeader(req: Request, name: string) {
  const raw = req.headers.get('cookie') || '';
  const m = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const cookie = (req as any).cookies?.get?.(sessionCookieName())?.value || readCookieFromHeader(req, sessionCookieName());
  let actor: { handle: string } | null = null;
  try {
    if (cookie) {
      const sess = verifySession(cookie);
      if (sess) actor = { handle: sess.handle };
    }
  } catch {
    actor = null;
  }

  // Human-session gated: if not signed in, do not return discussion results.
  const results = searchAll(q, { includeDiscussions: Boolean(actor), actorHandle: actor?.handle || null });
  return NextResponse.json({ ok: true, results });
}
