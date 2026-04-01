import { NextResponse } from 'next/server';
import { getProposal, proposalAction } from '@/server/repo';
import { requireAgentBearer, requireOwnerBackedAgent } from '@/lib/agentAuth';
import { hasHumanSession } from '@/lib/humanAuth';
import { sessionCookieName, verifySession } from '@/lib/auth';
import { normalizeErrorReason } from '@/lib/errors';
import { ownerHasOwnerOrMaintainerRole } from '@/lib/permissions';

const allowed = new Set(['approve', 'request_changes', 'reject', 'merge', 'comment']);

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
  return { ok: true as const, handle: sess.handle, userId: sess.user_id };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  const b = body as Record<string, unknown>;
  const action = String(b.action || '');
  if (!allowed.has(action)) return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });

  const actorHandle = b.actorHandle ? String(b.actorHandle) : undefined;
  const actorType = b.actorType === 'agent' ? 'agent' : 'human';

  // Governance boundary (product rule):
  // - agents may: comment, request_changes
  // - agents may NOT: approve, reject, merge
  // - approve/reject/merge require signed-in human session; actor identity comes from session (do not trust body).
  const governanceAction = action === 'approve' || action === 'reject' || action === 'merge';
  const executionAction = action === 'comment' || action === 'request_changes';

  // Phase 1: governance actions can be executed by a claimed agent,
  // but permissions are checked against the claimed HUMAN owner (owner|maintainer).
  if (actorType === 'agent' && governanceAction) {
    const h = actorHandle ? String(actorHandle) : '';
    const ob = requireOwnerBackedAgent(req, h);
    if (!ob.ok) return NextResponse.json({ ok: false, error: (ob as any).error, message: (ob as any).message }, { status: ob.status });

    const pr = getProposal(id);
    const projectSlug = pr?.projectSlug || null;
    if (!projectSlug || !ownerHasOwnerOrMaintainerRole(projectSlug, ob.ownerHandle)) {
      return NextResponse.json({ ok: false, error: 'not_allowed' }, { status: 403 });
    }

    try {
      const proposal = proposalAction({
        id,
        action: action as 'approve' | 'request_changes' | 'reject' | 'merge',
        actorHandle: h,
        actorType: 'agent',
        note: b.note ? String(b.note) : undefined,
      });
      return NextResponse.json({ ok: true, proposal });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'action_failed';
      return NextResponse.json({ ok: false, error: normalizeErrorReason(msg) }, { status: 400 });
    }
  }

  // For governance actions, force actor to be the signed-in human.
  let effectiveActorHandle: string | undefined = actorHandle;
  let effectiveActorType: 'human' | 'agent' = actorType;
  if (governanceAction) {
    const hs = requireHumanSession(req);
    if (!hs.ok) return NextResponse.json({ ok: false, error: hs.error }, { status: hs.status });
    effectiveActorHandle = hs.handle;
    effectiveActorType = 'human';
  }

  if (effectiveActorType === 'agent') {
    const h = effectiveActorHandle || '';
    const auth = requireAgentBearer(req, h);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const proposal = proposalAction({
      id,
      action: action as 'approve' | 'request_changes' | 'reject' | 'merge',
      actorHandle: effectiveActorHandle,
      actorType: effectiveActorType,
      note: b.note ? String(b.note) : undefined,
    });

    return NextResponse.json({ ok: true, proposal });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'action_failed';
    return NextResponse.json({ ok: false, error: normalizeErrorReason(msg) }, { status: 400 });
  }
}
