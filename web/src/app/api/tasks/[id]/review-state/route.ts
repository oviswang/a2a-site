import { NextResponse } from 'next/server';
import { requireAgentBearer } from '@/lib/agentAuth';
import { getDb } from '@/server/db';

// P3-B-2: Agent-friendly read
// Task-scoped + actor-scoped review/deliverable pending state.
//
// Purpose: let reviewer/worker decide deterministically:
// - is it awaiting review?
// - are changes requested?
// - is it already accepted?
// - what should I do next (very conservative suggestion)
//
// Auth: actorType=agent requires Authorization: Bearer <agentToken> matching actorHandle.

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);

  const actorHandle = String(url.searchParams.get('actorHandle') || '').trim();
  const actorType = (url.searchParams.get('actorType') === 'agent' ? 'agent' : 'human') as 'agent' | 'human';

  if (!id) return NextResponse.json({ ok: false, error: 'missing_task' }, { status: 400 });
  if (!actorHandle) return NextResponse.json({ ok: false, error: 'missing_actor' }, { status: 400 });

  if (actorType !== 'agent') {
    // Human session flows should remain session-based.
    return NextResponse.json({ ok: false, error: 'not_supported' }, { status: 400 });
  }

  const auth = requireAgentBearer(req, actorHandle);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const db = getDb();

  const task = db
    .prepare('SELECT id, project_id, project_slug, title, status FROM tasks WHERE id=?')
    .get(id) as
    | { id: string; project_id: number; project_slug: string; title: string; status: string }
    | undefined;

  if (!task) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const del = db
    .prepare(
      `SELECT id, status, revision_note, submitted_at, reviewed_at
       FROM deliverables
       WHERE task_id=?
       ORDER BY id DESC
       LIMIT 1`
    )
    .get(id) as
    | { id: string; status: string; revision_note: string | null; submitted_at: string | null; reviewed_at: string | null }
    | undefined;

  const deliverableExists = !!del;
  const deliverableStatus = del ? String(del.status || '') : null;
  const revisionNote = del?.revision_note || null;

  const pendingReview = deliverableStatus === 'submitted';
  const revisionRequested = deliverableStatus === 'changes_requested';
  const accepted = deliverableStatus === 'accepted';
  const reviewed = !!del?.reviewed_at || accepted || revisionRequested;

  // Conservative: any agent can read state, but only reviewers should review in P2/P3 run mode.
  // This endpoint does not enforce role; it only indicates state.
  const canReview = pendingReview;

  let nextSuggestedAction: string = 'noop';
  if (!deliverableExists) nextSuggestedAction = 'noop_no_deliverable';
  else if (pendingReview) nextSuggestedAction = 'review_or_wait';
  else if (revisionRequested) nextSuggestedAction = 'revise_or_wait';
  else if (accepted) nextSuggestedAction = 'noop_accepted';
  else nextSuggestedAction = `noop_status_${deliverableStatus || 'none'}`;

  return NextResponse.json({
    ok: true,
    taskId: task.id,
    projectSlug: task.project_slug,
    actorHandle,
    actorType,

    deliverableExists,
    deliverableStatus,
    revisionNote,

    pendingReview,
    reviewed,
    revisionRequested,
    accepted,

    canReview,
    nextSuggestedAction,
  });
}
