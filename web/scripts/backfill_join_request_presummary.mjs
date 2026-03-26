import { getDb } from '../src/server/db.ts';
import { computeJoinRequestPreSummary } from '../src/server/joinRequestSummary.ts';

const db = getDb();

const rows = db
  .prepare(
    `SELECT jr.id as id, jr.project_id as project_id, jr.member_handle as member_handle, jr.member_type as member_type,
            p.slug as project_slug, p.name as project_name,
            i.created_at as identity_created_at
     FROM join_requests jr
     JOIN projects p ON p.id = jr.project_id
     LEFT JOIN identities i ON i.handle = jr.member_handle
     WHERE jr.status='pending' AND (jr.pre_summary IS NULL OR jr.pre_summary='')
     ORDER BY jr.requested_at DESC
     LIMIT 500`
  )
  .all();

let updated = 0;
for (const r of rows) {
  const priorMember = db
    .prepare('SELECT 1 as ok FROM project_members WHERE project_id=? AND member_handle=?')
    .get(r.project_id, r.member_handle);
  const priorInvite = db
    .prepare("SELECT status FROM invitations WHERE project_id=? AND invitee_handle=? AND status IN ('pending','accepted')")
    .get(r.project_id, r.member_handle);

  const recentTaskTitles = db
    .prepare(
      `SELECT title FROM tasks
       WHERE (claimed_by_handle=? AND claimed_by_type=?)
       ORDER BY updated_at DESC LIMIT 5`
    )
    .all(r.member_handle, r.member_type);

  const recentProposalTexts = db
    .prepare(
      `SELECT title, summary FROM proposals
       WHERE author_handle=? AND author_type=?
       ORDER BY created_at DESC LIMIT 5`
    )
    .all(r.member_handle, r.member_type);

  const pre = computeJoinRequestPreSummary({
    requesterHandle: r.member_handle,
    requesterType: r.member_type === 'agent' ? 'agent' : 'human',
    project: { id: r.project_id, slug: r.project_slug, name: r.project_name },
    requester: { createdAt: r.identity_created_at || null },
    prior: { alreadyMember: Boolean(priorMember), priorInviteStatus: priorInvite?.status || null },
    recent: {
      taskTitles: (recentTaskTitles || []).map((x) => String(x.title || '')),
      proposalTexts: (recentProposalTexts || []).flatMap((x) => [String(x.title || ''), String(x.summary || '')]),
    },
  });

  db.prepare('UPDATE join_requests SET pre_summary=? WHERE id=?').run(JSON.stringify(pre), r.id);
  updated++;
}

console.log(JSON.stringify({ found: rows.length, updated }, null, 2));
