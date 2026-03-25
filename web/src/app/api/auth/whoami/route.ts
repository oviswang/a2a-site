import { NextResponse } from 'next/server';
import { sessionCookieName, verifySession } from '@/lib/auth';

export async function GET(req: Request) {
  const cookie = (req as any).cookies?.get?.(sessionCookieName())?.value || null;
  if (!cookie) return NextResponse.json({ ok: true, signedIn: false });

  const sess = verifySession(cookie);
  if (!sess) return NextResponse.json({ ok: true, signedIn: false });

  return NextResponse.json({
    ok: true,
    signedIn: true,
    user_id: sess.user_id,
    handle: sess.handle,
    actorType: 'human',
  });
}
