import { NextResponse } from 'next/server';
import { sessionCookieName, verifySession } from '@/lib/auth';

function readCookieFromHeader(req: Request, name: string) {
  const raw = req.headers.get('cookie') || '';
  const m = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

export async function GET(req: Request) {
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
    // Auth not configured: treat as signed out instead of 500.
    if (msg.startsWith('missing_env:AUTH_SESSION_SECRET')) return NextResponse.json({ ok: true, signedIn: false });
    // For any other error, surface a stable error instead of 500.
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
