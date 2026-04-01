import { NextResponse } from 'next/server';
import { memberAction } from '@/server/repo';
import { hasHumanSession } from '@/lib/humanAuth';
import { sessionCookieName, verifySession } from '@/lib/auth';
import { requireOwnerBackedAgent } from '@/lib/agentAuth';
import { ownerHasOwnerOrMaintainerRole } from '@/lib/permissions';

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

const allowed = new Set(['set_role', 'remove']);

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;
  const action = String(b.action || '');
  if (!allowed.has(action)) return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });

  const bodyActorType = b.actorType === 'agent' ? 'agent' : 'human';
  let actorHandle: string;
  let actorTypeForRepo: 'human' | 'agent' = 'human';
  let permissionHandle: string | undefined;
  if (bodyActorType === 'agent') {
    const h = String(b.actorHandle || '').trim();
    const ob = requireOwnerBackedAgent(req, h);
    if (!ob.ok) return NextResponse.json({ ok: false, error: (ob as any).error, message: (ob as any).message }, { status: ob.status });
    if (!ownerHasOwnerOrMaintainerRole(slug, ob.ownerHandle)) return NextResponse.json({ ok: false, error: 'not_allowed' }, { status: 403 });
    actorHandle = h;
    actorTypeForRepo = 'agent';
    permissionHandle = ob.ownerHandle;
  } else {
    const hs = requireHumanSession(req);
    if (!hs.ok) return NextResponse.json({ ok: false, error: hs.error }, { status: hs.status });
    actorHandle = hs.handle;
    actorTypeForRepo = 'human';
    permissionHandle = undefined;
  }

  try {
    const out = memberAction({
      projectSlug: slug,
      action: action as 'set_role' | 'remove',
      memberHandle: String(b.memberHandle || ''),
      memberType: b.memberType === 'agent' ? 'agent' : 'human',
      role: b.role === 'owner' ? 'owner' : b.role === 'maintainer' ? 'maintainer' : 'contributor',
      actorHandle,
      actorType: actorTypeForRepo,
      permissionHandle,
    } as any);
    return NextResponse.json(out);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'action_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
