import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { listIdentities } from '@/server/repo';

// Minimal global oversight aggregation.
// Focus: what needs human attention + which agents are recently active + which projects are recently active.

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export async function GET(_: Request) {
  const db = getDb();

  // 1) Needs attention (join requests)
  const joinRequests = (db
    .prepare(
      `SELECT
         jr.id AS id,
         jr.requested_at AS ts,
         jr.member_handle AS handle,
         jr.member_type AS member_type,
         p.slug AS project_slug,
         p.name AS project_name,
         p.visibility AS visibility,
         jr.pre_summary AS pre_summary
       FROM join_requests jr
       JOIN projects p ON p.id = jr.project_id
       WHERE jr.status='pending'
       ORDER BY jr.requested_at DESC
       LIMIT 50`
    )
    .all() as any[]).map((r) => {
    let preSummary = null as any;
    if (r.pre_summary) preSummary = safeJsonParse(String(r.pre_summary)) || null;
    return {
      type: 'join_request' as const,
      id: String(r.id),
      ts: String(r.ts),
      status: 'pending' as const,
      requester: { handle: String(r.handle), type: r.member_type === 'agent' ? 'agent' : 'human' },
      project: { slug: String(r.project_slug), name: String(r.project_name), visibility: r.visibility === 'restricted' ? 'restricted' : 'open' },
      link: `/projects/${encodeURIComponent(String(r.project_slug))}#people`,
      preSummary,
    };
  });

  // 2) Needs attention (pending invites)
  const invites = (db
    .prepare(
      `SELECT
         i.id AS id,
         i.created_at AS ts,
         i.invitee_handle AS invitee_handle,
         i.invitee_type AS invitee_type,
         i.role AS role,
         i.created_by_handle AS inviter_handle,
         i.created_by_type AS inviter_type,
         p.slug AS project_slug,
         p.name AS project_name,
         p.visibility AS visibility
       FROM invitations i
       JOIN projects p ON p.id = i.project_id
       WHERE i.status='pending'
       ORDER BY i.created_at DESC
       LIMIT 50`
    )
    .all() as any[]).map((r) => ({
    type: 'invite' as const,
    id: String(r.id),
    ts: String(r.ts),
    status: 'pending' as const,
    role: String(r.role),
    invitee: { handle: String(r.invitee_handle), type: r.invitee_type === 'agent' ? 'agent' : 'human' },
    inviter: { handle: String(r.inviter_handle), type: r.inviter_type === 'agent' ? 'agent' : 'human' },
    project: { slug: String(r.project_slug), name: String(r.project_name), visibility: r.visibility === 'restricted' ? 'restricted' : 'open' },
    link: `/projects/${encodeURIComponent(String(r.project_slug))}#people`,
  }));

  // 3) Needs attention (proposals needing review)
  const proposals = (db
    .prepare(
      `SELECT
         pr.id AS id,
         pr.created_at AS ts,
         pr.title AS title,
         pr.status AS status,
         pr.author_handle AS author_handle,
         p.slug AS project_slug,
         p.name AS project_name,
         p.visibility AS visibility,
         pr.file_path AS file_path
       FROM proposals pr
       JOIN projects p ON p.id = pr.project_id
       WHERE pr.status='needs_review'
       ORDER BY pr.created_at DESC
       LIMIT 50`
    )
    .all() as any[]).map((r) => ({
    type: 'proposal' as const,
    id: String(r.id),
    ts: String(r.ts),
    status: String(r.status),
    title: String(r.title),
    authorHandle: String(r.author_handle),
    filePath: String(r.file_path),
    project: { slug: String(r.project_slug), name: String(r.project_name), visibility: r.visibility === 'restricted' ? 'restricted' : 'open' },
    link: `/proposals/${encodeURIComponent(String(r.id))}/review`,
  }));

  // 4) Needs attention (deliverables submitted awaiting review)
  const deliverables = (db
    .prepare(
      `SELECT
         d.task_id AS task_id,
         d.submitted_at AS ts,
         d.status AS status,
         d.author_handle AS author_handle,
         d.project_slug AS project_slug
       FROM task_deliverables d
       WHERE d.status='submitted'
       ORDER BY d.submitted_at DESC
       LIMIT 50`
    )
    .all() as any[]).map((r) => ({
    type: 'deliverable' as const,
    id: String(r.task_id),
    ts: String(r.ts || ''),
    status: String(r.status),
    authorHandle: String(r.author_handle),
    project: { slug: String(r.project_slug) },
    link: `/tasks/${encodeURIComponent(String(r.task_id))}`,
  }));

  const needsAttention = [...joinRequests, ...invites, ...proposals, ...deliverables]
    .filter((x) => x.ts)
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
    .slice(0, 80);

  // 5) Recently active agents (presence)
  const agentPresence = (db
    .prepare(
      `SELECT ar.agent_handle AS handle, ar.last_seen AS last_seen
       FROM agent_runtime ar
       ORDER BY ar.last_seen DESC
       LIMIT 20`
    )
    .all() as any[]).map((r) => ({ handle: String(r.handle), lastSeen: String(r.last_seen) }));

  // Enrich with identity displayName/claimState if present
  const identities = listIdentities();
  const idByHandle = new Map(identities.map((i) => [i.handle, i] as const));
  const agents = agentPresence.map((a) => ({
    handle: a.handle,
    lastSeen: a.lastSeen,
    displayName: idByHandle.get(a.handle)?.displayName || null,
    claimState: idByHandle.get(a.handle)?.claimState || null,
    link: `/agents/${encodeURIComponent(a.handle)}`,
  }));

  // 6) Recently active projects (use activity table)
  const projects = (db
    .prepare(
      `SELECT p.slug AS slug, p.name AS name, p.visibility AS visibility, MAX(a.ts) AS last_ts
       FROM projects p
       LEFT JOIN activity a ON a.project_id = p.id
       GROUP BY p.id
       ORDER BY COALESCE(last_ts, p.created_at) DESC
       LIMIT 20`
    )
    .all() as any[]).map((r) => ({
    slug: String(r.slug),
    name: String(r.name),
    visibility: r.visibility === 'restricted' ? 'restricted' : 'open',
    lastTs: r.last_ts ? String(r.last_ts) : null,
    link: `/projects/${encodeURIComponent(String(r.slug))}`,
  }));

  return NextResponse.json({ ok: true, needsAttention, agents, projects });
}

