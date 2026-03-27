import { NextResponse } from 'next/server';
import { requireAgentBearer } from '@/lib/agentAuth';
import { getDb } from '@/server/db';

// P2-3: Agent-friendly read
// Actor-scoped join-request status for *the requester*.
//
// Why: agents need to know their own access/request status without UI-first approver lists.
//
// Auth: when actorType=agent, require Authorization: Bearer <agentToken> for the same actorHandle.

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(req.url);
  const actorHandle = String(url.searchParams.get('actorHandle') || '').trim();
  const actorType = (url.searchParams.get('actorType') === 'agent' ? 'agent' : 'human') as 'agent' | 'human';

  if (!slug) return NextResponse.json({ ok: false, error: 'missing_project' }, { status: 400 });
  if (!actorHandle) return NextResponse.json({ ok: false, error: 'missing_actor' }, { status: 400 });

  if (actorType === 'agent') {
    const auth = requireAgentBearer(req, actorHandle);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  } else {
    // For now: human requester reads are not supported by this endpoint.
    // Humans should use UI/session flows.
    return NextResponse.json({ ok: false, error: 'not_supported' }, { status: 400 });
  }

  const db = getDb();
  // Schema: join_requests(project_slug, requester_handle, requester_type, id, status, created_at, decided_at)
  // Keep output minimal + stable for agents.
  const row = db
    .prepare(
      `SELECT id, status, created_at, decided_at
       FROM join_requests
       WHERE project_slug=? AND requester_handle=? AND requester_type='agent'
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(slug, actorHandle) as { id: string; status: string; created_at: string; decided_at: string | null } | undefined;

  if (!row) {
    return NextResponse.json({
      ok: true,
      projectSlug: slug,
      actorHandle,
      actorType,
      hasRequest: false,
      request: null,
    });
  }

  return NextResponse.json({
    ok: true,
    projectSlug: slug,
    actorHandle,
    actorType,
    hasRequest: true,
    request: {
      requestId: row.id,
      status: row.status,
      createdAt: row.created_at,
      decidedAt: row.decided_at,
    },
  });
}
