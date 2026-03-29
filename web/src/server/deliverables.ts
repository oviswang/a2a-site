import { getDb } from './db';
import type { EvidenceLink, MemberType, TaskDeliverable } from './repo';

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return `d-${Math.random().toString(16).slice(2, 6)}${Date.now().toString(16).slice(-4)}`;
}

function safeParseEvidenceLinks(input: unknown): EvidenceLink[] {
  if (!Array.isArray(input)) return [];
  const out: EvidenceLink[] = [];
  for (const it of input) {
    if (!it || typeof it !== 'object') continue;
    const url = typeof (it as any).url === 'string' ? String((it as any).url).trim() : '';
    if (!url) continue;
    const label = typeof (it as any).label === 'string' ? String((it as any).label).trim() : undefined;
    out.push(label ? { label, url } : { url });
  }
  return out;
}

export function getDeliverableForTask(taskId: string): TaskDeliverable | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, task_id, project_slug, author_handle, author_type, summary_md, evidence_links_json, status,
              revision_note, created_at, updated_at, submitted_at, reviewed_at
       FROM task_deliverables
       WHERE task_id=?`
    )
    .get(taskId) as
    | {
        id: string;
        task_id: string;
        project_slug: string;
        author_handle: string;
        author_type: string;
        summary_md: string;
        evidence_links_json: string;
        status: string;
        revision_note: string | null;
        created_at: string;
        updated_at: string;
        submitted_at: string | null;
        reviewed_at: string | null;
      }
    | undefined;
  if (!row) return null;

  let links: EvidenceLink[] = [];
  try {
    links = safeParseEvidenceLinks(JSON.parse(row.evidence_links_json || '[]'));
  } catch {}

  return {
    id: row.id,
    taskId: row.task_id,
    projectSlug: row.project_slug,
    authorHandle: row.author_handle,
    authorType: row.author_type === 'agent' ? 'agent' : 'human',
    summaryMd: row.summary_md || '',
    evidenceLinks: links,
    status:
      row.status === 'submitted'
        ? 'submitted'
        : row.status === 'changes_requested'
          ? 'changes_requested'
          : row.status === 'accepted'
            ? 'accepted'
            : 'draft',
    revisionNote: row.revision_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
  };
}

export function upsertDeliverableDraft(args: {
  taskId: string;
  actorHandle: string;
  actorType: MemberType;
  summaryMd: string;
  evidenceLinks: unknown;
}): TaskDeliverable {
  const db = getDb();

  const task = db
    .prepare(
      `SELECT t.id, p.slug as project_slug
       FROM tasks t
       JOIN projects p ON p.id=t.project_id
       WHERE t.id=?`
    )
    .get(args.taskId) as { id: string; project_slug: string } | undefined;
  if (!task) throw new Error('task_not_found');

  const existing = getDeliverableForTask(args.taskId);
  const now = nowIso();
  const links = safeParseEvidenceLinks(args.evidenceLinks);

  const DEFAULT_TEMPLATE = `## Summary\n\n- (one sentence outcome)\n\n## What was done\n\n- \n\n## Evidence\n\n- \n\n## Risks / Notes\n\n- \n\n## Acceptance checklist\n\n- [ ] \n`;

  if (!existing) {
    const id = newId();
    const md = (args.summaryMd || '').trim() ? String(args.summaryMd) : DEFAULT_TEMPLATE;
    db.prepare(
      `INSERT INTO task_deliverables (id, task_id, project_slug, author_handle, author_type, summary_md, evidence_links_json, status, revision_note, created_at, updated_at, submitted_at, reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      args.taskId,
      task.project_slug,
      args.actorHandle,
      args.actorType,
      md,
      JSON.stringify(links),
      'draft',
      null,
      now,
      now,
      null,
      null
    );
    return getDeliverableForTask(args.taskId)!;
  }

  if (existing.status === 'accepted') throw new Error('deliverable_already_accepted');

  // allow edits in draft or changes_requested (not in submitted)
  if (existing.status === 'submitted') throw new Error('deliverable_locked_pending_review');

  db.prepare(
    `UPDATE task_deliverables
     SET summary_md=?, evidence_links_json=?, updated_at=?, author_handle=?, author_type=?
     WHERE task_id=?`
  ).run(args.summaryMd || '', JSON.stringify(links), now, args.actorHandle, args.actorType, args.taskId);

  return getDeliverableForTask(args.taskId)!;
}

export function submitDeliverable(args: { taskId: string; actorHandle: string; actorType: MemberType }): TaskDeliverable {
  const existing = getDeliverableForTask(args.taskId);
  if (!existing) throw new Error('deliverable_missing');
  if (!existing.summaryMd.trim()) throw new Error('deliverable_summary_required');
  if (existing.status === 'accepted') throw new Error('deliverable_already_accepted');

  const db = getDb();
  const now = nowIso();

  db.prepare(
    `UPDATE task_deliverables
     SET status='submitted', submitted_at=?, updated_at=?, author_handle=?, author_type=?
     WHERE task_id=?`
  ).run(now, now, args.actorHandle, args.actorType, args.taskId);

  // lightweight signal
  const pslug = existing.projectSlug;
  try {
    const watchers = db
      .prepare(
        `SELECT member_handle FROM project_members pm
         JOIN projects p ON p.slug=? AND p.id=pm.project_id
         WHERE pm.member_type='human' AND (pm.role='owner' OR pm.role='maintainer')`
      )
      .all(pslug) as Array<{ member_handle: string }>;
    for (const w of watchers) {
      db.prepare('INSERT INTO notifications (id, user_handle, kind, text, link, created_at, read_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        `n-${Math.random().toString(16).slice(2, 8)}${Date.now().toString(16).slice(-4)}`,
        w.member_handle,
        'deliverable.submitted',
        `Deliverable submitted: ${args.taskId}`,
        `/tasks/${args.taskId}`,
        now,
        null
      );
    }
  } catch {}

  // task event (for Recent activity / coordination)
  try {
    db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      args.taskId,
      now,
      args.actorHandle,
      args.actorType,
      'deliverable.submitted',
      null,
      null
    );
  } catch {}

  return getDeliverableForTask(args.taskId)!;
}

export function reviewDeliverable(args: {
  taskId: string;
  action: 'accept' | 'request_changes';
  actorHandle: string;
  actorType: MemberType;
  revisionNote?: string | null;
}): TaskDeliverable {
  const existing = getDeliverableForTask(args.taskId);
  if (!existing) throw new Error('deliverable_missing');
  if (existing.status !== 'submitted') throw new Error('deliverable_not_submitted');

  if (args.action === 'request_changes' && !String(args.revisionNote || '').trim()) {
    throw new Error('revision_note_required');
  }

  const db = getDb();
  const now = nowIso();

  if (args.action === 'accept') {
    db.prepare(
      `UPDATE task_deliverables
       SET status='accepted', reviewed_at=?, updated_at=?, revision_note=NULL
       WHERE task_id=?`
    ).run(now, now, args.taskId);

    // structured activity log
    try {
      db.prepare(
        'INSERT INTO activity (project_id, ts, text, kind, entity_type, entity_id) VALUES ((SELECT id FROM projects WHERE slug=?), ?, ?, ?, ?, ?)'
      ).run(existing.projectSlug, now, `Deliverable accepted for ${args.taskId}`, 'deliverable.accepted', 'task', args.taskId);
    } catch {}

    // task event
    try {
      db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        args.taskId,
        now,
        args.actorHandle,
        args.actorType,
        'deliverable.accepted',
        null,
        null
      );
    } catch {}
  } else {
    db.prepare(
      `UPDATE task_deliverables
       SET status='changes_requested', reviewed_at=?, updated_at=?, revision_note=?
       WHERE task_id=?`
    ).run(now, now, String(args.revisionNote || '').trim(), args.taskId);

    // signal to human inbox (and optionally to the author if human)
    try {
      const watchers = db
        .prepare(
          `SELECT member_handle FROM project_members pm
           JOIN projects p ON p.slug=? AND p.id=pm.project_id
           WHERE pm.member_type='human' AND (pm.role='owner' OR pm.role='maintainer')`
        )
        .all(existing.projectSlug) as Array<{ member_handle: string }>;
      for (const w of watchers) {
        db.prepare('INSERT INTO notifications (id, user_handle, kind, text, link, created_at, read_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          `n-${Math.random().toString(16).slice(2, 8)}${Date.now().toString(16).slice(-4)}`,
          w.member_handle,
          'deliverable.changes_requested',
          `Changes requested: ${args.taskId}`,
          `/tasks/${args.taskId}`,
          now,
          null
        );
      }
    } catch {}

    // task event
    try {
      db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        args.taskId,
        now,
        args.actorHandle,
        args.actorType,
        'deliverable.changes_requested',
        String(args.revisionNote || '').trim() || null,
        null
      );
    } catch {}
  }

  return getDeliverableForTask(args.taskId)!;
}

export function listRecentAcceptedDeliverables(projectSlug: string, limit = 20): TaskDeliverable[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, task_id, project_slug, author_handle, author_type, summary_md, evidence_links_json, status,
              revision_note, created_at, updated_at, submitted_at, reviewed_at
       FROM task_deliverables
       WHERE project_slug=? AND status='accepted'
       ORDER BY reviewed_at DESC
       LIMIT ?`
    )
    .all(projectSlug, limit) as Array<any>;

  return rows
    .map((r) => {
      let links: EvidenceLink[] = [];
      try {
        links = safeParseEvidenceLinks(JSON.parse(r.evidence_links_json || '[]'));
      } catch {}
      return {
        id: r.id,
        taskId: r.task_id,
        projectSlug: r.project_slug,
        authorHandle: r.author_handle,
        authorType: r.author_type === 'agent' ? 'agent' : 'human',
        summaryMd: r.summary_md || '',
        evidenceLinks: links,
        status: 'accepted',
        revisionNote: r.revision_note,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        submittedAt: r.submitted_at,
        reviewedAt: r.reviewed_at,
      } as TaskDeliverable;
    })
    .filter(Boolean);
}
