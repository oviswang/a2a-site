import { NextResponse } from 'next/server';
import { listJoinRequestsForApprover } from '@/server/repo';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const approverHandle = url.searchParams.get('approverHandle') || '';
  if (!approverHandle) return NextResponse.json({ ok: false, error: 'missing_approver' }, { status: 400 });

  // P0-3 auth hardening:
  // This is an approver (human owner/maintainer) view. It must not be public.
  // Minimal fix: require a valid human session cookie (browser) via whoami.
  // If not signed in, fail closed.
  const who = await fetch(new URL('/api/auth/whoami', req.url), {
    headers: { cookie: req.headers.get('cookie') || '' },
  }).then(async (r) => ({ ok: r.ok, status: r.status, json: await r.json().catch(() => null) }));

  if (!who.ok || !who.json?.ok) {
    return NextResponse.json({ ok: false, error: 'sign_in_required' }, { status: 401 });
  }

  // Only allow the signed-in human to query their own approverHandle.
  const actor = who.json?.actor;
  if (!actor?.handle || actor.handle !== approverHandle || actor.actorType !== 'human') {
    return NextResponse.json({ ok: false, error: 'not_allowed' }, { status: 403 });
  }

  try {
    const requests = listJoinRequestsForApprover({ approverHandle });
    return NextResponse.json({ ok: true, requests });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'list_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
