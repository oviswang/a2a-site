import { NextResponse } from 'next/server';
import { getProject } from '@/server/repo';
import { getDb } from '@/server/db';
import { listRecentIntentMarkersForTarget } from '@/server/repo';
import { roleContractNote, suggestedRoleForAttentionItem } from '@/lib/roleContract';

// Project get (high-value read):
// - shared objects (project/proposals/tasks)
// - action-ready attention queue
// - minimal soft assignment hints (no locks)
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  // Keep `proposals` and `tasks` as top-level fields for the client store.
  const proposals = Array.isArray((project as Record<string, unknown>).proposals)
    ? ((project as Record<string, unknown>).proposals as unknown[])
    : [];
  const tasks = Array.isArray((project as Record<string, unknown>).tasks) ? ((project as Record<string, unknown>).tasks as unknown[]) : [];

  const projectWebUrl = `/projects/${slug}`;
  const tasksWithUrls = tasks.map((t: any) => ({ ...t, webUrl: `/tasks/${t.id}` }));
  const proposalsWithUrls = proposals.map((p: any) => ({ ...p, webUrl: `/proposals/${p.id}/review` }));

  // Minimal reviewer/attention queue summary.
  // Project-scoped only; short list; deterministic ordering.
  let attentionSummary: any = null;
  try {
    const db = getDb();

    const pRows = db
      .prepare(
        `SELECT pr.id AS id, pr.created_at AS ts, pr.title AS title
         FROM proposals pr
         JOIN projects p ON p.id=pr.project_id
         WHERE p.slug=? AND pr.status='needs_review'
         ORDER BY pr.created_at DESC
         LIMIT 10`
      )
      .all(slug) as Array<{ id: string; ts: string; title: string }>;

    const dRows = db
      .prepare(
        `SELECT d.task_id AS id, d.submitted_at AS ts, t.title AS title
         FROM task_deliverables d
         JOIN tasks t ON t.id=d.task_id
         WHERE d.project_slug=? AND d.status='submitted'
         ORDER BY d.submitted_at DESC
         LIMIT 10`
      )
      .all(slug) as Array<{ id: string; ts: string; title: string }>;

    const rawItems = [
      ...pRows.map((r) => ({
        type: 'proposal' as const,
        id: String(r.id),
        ts: String(r.ts || ''),
        title: String(r.title || ''),
        webUrl: `/proposals/${encodeURIComponent(String(r.id))}/review`,
        nextSuggestedAction: 'review_proposal' as const,
      })),
      ...dRows.map((r) => ({
        type: 'deliverable' as const,
        id: String(r.id), // taskId
        ts: String(r.ts || ''),
        title: String(r.title || ''),
        webUrl: `/tasks/${encodeURIComponent(String(r.id))}`,
        nextSuggestedAction: 'review_deliverable' as const,
      })),
    ]
      .filter((x) => x.ts)
      .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
      .slice(0, 10);

    // Soft assignment hint:
    // - compute contention from recent intent markers
    // - label each item as good_candidate vs avoid_for_now
    // - do not reorder items (keep deterministic ordering)
    const items = rawItems.map((it) => {
      const targetType = it.type === 'proposal' ? 'proposal' : 'deliverable';
      const markers = listRecentIntentMarkersForTarget({ targetType, targetId: String(it.id), limit: 5 });
      const activeIntentCount = markers.filter((m) => !!m?.intent).length;
      const contentionLevel = activeIntentCount > 0 ? ('active' as const) : ('low' as const);
      const assignmentHint = activeIntentCount > 0 ? ('avoid_for_now' as const) : ('good_candidate' as const);

      const suggestedRole = suggestedRoleForAttentionItem({ type: it.type === 'proposal' ? 'proposal' : it.type === 'deliverable' ? 'deliverable' : 'deliverable', nextSuggestedAction: String(it.nextSuggestedAction || '') });
      return {
        ...it,
        // coordination meta
        suggestedRole,
        roleHint: roleContractNote(suggestedRole),
        activeIntentCount,
        contentionLevel,
        assignmentHint,
        intentMarkers: markers,
      };
    });

    attentionSummary = {
      counts: { proposalsNeedsReview: pRows.length, deliverablesSubmitted: dRows.length },
      items,
    };
  } catch {
    attentionSummary = { counts: { proposalsNeedsReview: 0, deliverablesSubmitted: 0 }, items: [] };
  }

  const res = NextResponse.json({
    ok: true,
    project: { ...(project as any), webUrl: projectWebUrl },
    proposals: proposalsWithUrls,
    tasks: tasksWithUrls,
    attentionSummary,
  });



  return res;
}
