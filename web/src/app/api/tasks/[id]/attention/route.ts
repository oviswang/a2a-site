import { NextResponse } from 'next/server';
import { getTaskChildrenWithRollup, getTask } from '@/server/repo';

// Minimal deterministic needs-attention aggregation for parent tasks.
// Output is API-first (stable fields) so agents do not have to re-implement UI heuristics.
// Priority: blocked > revision_requested > awaiting_review

type AttentionType = 'blocked' | 'revision_requested' | 'awaiting_review';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parent = getTask(id);
  if (!parent) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  // Only meaningful for parent tasks; for child tasks return empty.
  if (parent.parentTaskId) {
    return NextResponse.json({ ok: true, parentTaskId: id, counts: { blocked: 0, revisionRequested: 0, awaitingReview: 0 }, items: [] });
  }

  const out = getTaskChildrenWithRollup(id);

  const items: Array<{
    taskId: string;
    title: string;
    type: AttentionType;
    reason: string | null;
    ts: string | null;
  }> = [];

  for (const t of out.children) {
    const d = out.deliverablesByTaskId[t.id] || null;

    if (t.isBlocked) {
      items.push({
        taskId: t.id,
        title: t.title || t.id,
        type: 'blocked',
        reason: t.blockedReason || (t.blockedByTaskId ? `blocked by ${t.blockedByTaskId}` : null),
        ts: t.updatedAt || null,
      });
      continue;
    }

    if (d?.status === 'changes_requested') {
      items.push({
        taskId: t.id,
        title: t.title || t.id,
        type: 'revision_requested',
        reason: (d.revisionNote || '').trim() ? d.revisionNote : null,
        ts: (d.reviewedAt || d.updatedAt || null) as any,
      });
      continue;
    }

    if (d?.status === 'submitted') {
      items.push({
        taskId: t.id,
        title: t.title || t.id,
        type: 'awaiting_review',
        reason: null,
        ts: (d.submittedAt || d.updatedAt || null) as any,
      });
    }
  }

  const prio = (x: (typeof items)[number]) => (x.type === 'blocked' ? 0 : x.type === 'revision_requested' ? 1 : 2);
  items.sort((a, b) => {
    const pa = prio(a);
    const pb = prio(b);
    if (pa !== pb) return pa - pb;
    return String(b.ts || '').localeCompare(String(a.ts || ''));
  });

  const counts = {
    blocked: items.filter((x) => x.type === 'blocked').length,
    revisionRequested: items.filter((x) => x.type === 'revision_requested').length,
    awaitingReview: items.filter((x) => x.type === 'awaiting_review').length,
  };

  return NextResponse.json({ ok: true, parentTaskId: id, counts, items: items.slice(0, 10) });
}
