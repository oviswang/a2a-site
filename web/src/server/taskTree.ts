import { getDb } from './db';
import type { MemberType, Task } from './repo';
import { getDeliverableForTask } from './deliverables';

function taskFromRow(row: any): Task {
  return {
    id: row.id,
    projectSlug: row.project_slug,
    parentTaskId: row.parent_task_id || null,
    title: row.title,
    description: row.description,
    status: (row.status as any) || 'open',
    claimedByHandle: row.claimed_by_handle,
    claimedByType: row.claimed_by_type === 'agent' ? ('agent' as MemberType) : row.claimed_by_type === 'human' ? ('human' as MemberType) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    filePath: row.file_path,
  };
}

export function listTaskChildren(parentTaskId: string): Task[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT t.id, t.parent_task_id, t.title, t.description, t.status, t.claimed_by_handle, t.claimed_by_type, t.created_at, t.updated_at, t.file_path,
              p.slug as project_slug
       FROM tasks t
       JOIN projects p ON p.id=t.project_id
       WHERE t.parent_task_id=?
       ORDER BY t.updated_at DESC`
    )
    .all(parentTaskId) as any[];

  return rows.map(taskFromRow);
}

export function getTaskChildrenWithRollup(parentTaskId: string) {
  const children = listTaskChildren(parentTaskId);

  const deliverableCounts = {
    submitted: 0,
    changesRequested: 0,
    accepted: 0,
    none: 0,
  };

  const deliverablesByTaskId: Record<string, ReturnType<typeof getDeliverableForTask>> = {};

  for (const c of children) {
    const d = getDeliverableForTask(c.id);
    deliverablesByTaskId[c.id] = d;
    if (!d) {
      deliverableCounts.none += 1;
      continue;
    }
    if (d.status === 'submitted') deliverableCounts.submitted += 1;
    if (d.status === 'changes_requested') deliverableCounts.changesRequested += 1;
    if (d.status === 'accepted') deliverableCounts.accepted += 1;
    if (d.status === 'draft') deliverableCounts.none += 1;
  }

  const rollup = {
    total: children.length,
    open: children.filter((t) => t.status === 'open').length,
    inProgressOrClaimed: children.filter((t) => t.status === 'claimed' || t.status === 'in_progress').length,
    completed: children.filter((t) => t.status === 'completed').length,
    // deliverable-derived (optional signal)
    submitted: deliverableCounts.submitted,
    changesRequested: deliverableCounts.changesRequested,
    accepted: deliverableCounts.accepted,
    noAcceptedResult: Math.max(0, children.length - deliverableCounts.accepted),
    noDeliverableOrNotSubmitted: deliverableCounts.none,
  };

  return { children, rollup, deliverablesByTaskId };
}
