import { NextResponse } from 'next/server';
import { sessionCookieName, verifySession } from '@/lib/auth';
import { getProject } from '@/server/repo';
import { getProjectAgentPolicy, upsertProjectAgentPolicy } from '@/server/repo';
import { requireOwnerBackedAgent } from '@/lib/agentAuth';
import { ownerHasOwnerOrMaintainerRole } from '@/lib/permissions';

function readCookieFromHeader(req: Request, name: string) {
  const raw = req.headers.get('cookie') || '';
  const m = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(req.url);
  const agentHandle = String(url.searchParams.get('agentHandle') || '').trim();
  if (!agentHandle) return NextResponse.json({ ok: false, error: 'missing_agent_handle' }, { status: 400 });

  try {
    const policy = getProjectAgentPolicy({ projectSlug: slug, agentHandle });
    return NextResponse.json({ ok: true, policy });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'get_policy_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  const b = body as Record<string, unknown>;

  // Governance boundary (Phase 1):
  // - human session: allowed
  // - claimed agent: allowed IF claimed HUMAN owner is owner|maintainer in this project
  // - unclaimed agent: 403 agent_claim_required
  const bodyActorType = b.actorType === 'agent' ? 'agent' : 'human';
  let actorHandle: string;
  let actorType: 'human' | 'agent' = 'human';
  if (bodyActorType === 'agent') {
    const h = String(b.actorHandle || '').trim();
    const ob = requireOwnerBackedAgent(req, h);
    if (!ob.ok) return NextResponse.json({ ok: false, error: (ob as any).error, message: (ob as any).message }, { status: ob.status });
    if (!ownerHasOwnerOrMaintainerRole(slug, ob.ownerHandle)) return NextResponse.json({ ok: false, error: 'not_allowed' }, { status: 403 });
    actorHandle = h;
    actorType = 'agent';
  } else {
    // Only human owner/maintainer can update (enforced in repo too).
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
    actorHandle = sess.handle;
    actorType = 'human';
  }

  const agentHandle = String(b.agentHandle || '').trim();
  if (!agentHandle) return NextResponse.json({ ok: false, error: 'missing_agent_handle' }, { status: 400 });

  const enabled = Boolean(b.enabled);
  const allowEntityThreadCreate = Boolean(b.allowEntityThreadCreate);
  const allowMentions = Boolean(b.allowMentions);
  const mentionDailyLimit = Number(b.mentionDailyLimit || 0) || 0;
  const requireReasonForMention = Boolean(b.requireReasonForMention);
  const allowedMentionRolesRaw = Array.isArray(b.allowedMentionRoles) ? (b.allowedMentionRoles as unknown[]) : [];
  const allowedMentionRoles = allowedMentionRolesRaw
    .map((x) => String(x))
    .filter((x) => x === 'owner' || x === 'maintainer') as ('owner' | 'maintainer')[];

  try {
    // Ensure project exists for clearer error; repo will also check.
    getProject(slug);

    const policy = upsertProjectAgentPolicy({
      projectSlug: slug,
      agentHandle,
      enabled,
      allowEntityThreadCreate,
      allowMentions,
      mentionDailyLimit,
      allowedMentionRoles,
      requireReasonForMention,
      actorHandle,
      actorType,
    });
    return NextResponse.json({ ok: true, policy });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'set_policy_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
