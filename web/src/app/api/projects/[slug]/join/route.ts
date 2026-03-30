import { NextResponse } from 'next/server';
import { joinProject } from '@/server/repo';
import { getBearerToken, requireAgentBearer } from '@/lib/agentAuth';
import { getDb } from '@/server/db';
import crypto from 'node:crypto';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });

  // Bearer actor binding: if Authorization: Bearer <agentToken> is present and valid,
  // force actorType=agent and actorHandle from the token identity.
  // This prevents body actor spoofing and makes agent joins deterministic.
  const bearer = getBearerToken(req);
  if (bearer) {
    const h = crypto.createHash('sha256').update(String(bearer).trim()).digest('hex');
    const db = getDb();
    const row = db
      .prepare("SELECT handle FROM identities WHERE identity_type='agent' AND binding_token_hash=?")
      .get(h) as { handle: string } | undefined;
    if (!row) return NextResponse.json({ ok: false, error: 'invalid_agent_token' }, { status: 403 });

    const actorHandle = String(row.handle);
    const actorType = 'agent' as const;

    // Defense-in-depth: also require the bearer to match the resolved handle.
    const auth = requireAgentBearer(req, actorHandle);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    try {
      const result = joinProject({ projectSlug: slug, actorHandle, actorType });

      const r: any = result as any;
      const joinState: 'joined' | 'requested' | 'unknown' =
        r?.mode === 'joined' || r?.joinState === 'joined' || r?.status === 'joined'
          ? 'joined'
          : r?.mode === 'requested' || r?.joinState === 'requested' || r?.status === 'requested'
            ? 'requested'
            : 'unknown';

      const accessMode: 'open' | 'restricted' | 'unknown' =
        r?.accessMode === 'open' || r?.visibility === 'open'
          ? 'open'
          : r?.accessMode === 'restricted' || r?.visibility === 'restricted'
            ? 'restricted'
            : 'unknown';

      const joinRequestId: string | null =
        typeof r?.requestId === 'string' ? r.requestId : typeof r?.joinRequestId === 'string' ? r.joinRequestId : null;

      const nextSuggestedAction = joinState === 'joined' ? 'proceed_to_tasks' : 'poll_join_request_status';

      return NextResponse.json({
        ok: true,
        projectSlug: slug,
        actorHandle,
        actorType,
        joinState,
        accessMode,
        joinRequestId,
        nextSuggestedAction,
        result,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'join_failed';
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
  }

  // No bearer: fall back to explicit body actor.
  const b = body as Record<string, unknown>;
  const actorHandle = String(b.actorHandle || 'local-human');
  const actorType = b.actorType === 'agent' ? 'agent' : 'human';

  if (actorType === 'agent') {
    const auth = requireAgentBearer(req, actorHandle);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const result = joinProject({
      projectSlug: slug,
      actorHandle,
      actorType,
    });

    const r: any = result as any;
    const joinState: 'joined' | 'requested' | 'unknown' =
      r?.mode === 'joined' || r?.joinState === 'joined' || r?.status === 'joined'
        ? 'joined'
        : r?.mode === 'requested' || r?.joinState === 'requested' || r?.status === 'requested'
          ? 'requested'
          : 'unknown';

    const accessMode: 'open' | 'restricted' | 'unknown' =
      r?.accessMode === 'open' || r?.visibility === 'open'
        ? 'open'
        : r?.accessMode === 'restricted' || r?.visibility === 'restricted'
          ? 'restricted'
          : 'unknown';

    const joinRequestId: string | null =
      typeof r?.requestId === 'string' ? r.requestId : typeof r?.joinRequestId === 'string' ? r.joinRequestId : null;

    const nextSuggestedAction = joinState === 'joined' ? 'proceed_to_tasks' : 'poll_join_request_status';

    return NextResponse.json({
      ok: true,
      projectSlug: slug,
      actorHandle,
      actorType,
      joinState,
      accessMode,
      joinRequestId,
      nextSuggestedAction,
      result,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'join_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
