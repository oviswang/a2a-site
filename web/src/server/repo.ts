import { getDb } from './db';

export type Visibility = 'open' | 'restricted';
export type ProposalStatus = 'needs_review' | 'approved' | 'changes_requested' | 'rejected' | 'merged';

export type MemberType = 'human' | 'agent';
export type MemberRole = 'owner' | 'maintainer' | 'contributor';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

function nowIso() {
  return new Date().toISOString();
}

function slugify(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

type ProjectRow = {
  id: number;
  slug: string;
  name: string;
  summary: string;
  visibility: string;
  tags_json: string;
  created_at: string;
};

type FileRow = { path: string; content: string; updated_at: string };

type ProposalRow = {
  id: string;
  project_id: number;
  title: string;
  author_handle: string;
  author_type?: string;
  created_at: string;
  status: string;
  summary: string;
  file_path: string;
  new_content: string;
};

type ActivityRow = { ts: string; text: string };

type MemberRow = { member_handle: string; member_type: string; role: string; joined_at: string };

type JoinRequestRow = {
  id: string;
  member_handle: string;
  member_type: string;
  requested_at: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

function getProjectBySlug(slug: string) {
  const db = getDb();
  return db
    .prepare('SELECT id, slug, name, summary, visibility, tags_json, created_at FROM projects WHERE slug=?')
    .get(slug) as ProjectRow | undefined;
}

export function listProjects() {
  const db = getDb();
  const rows = db
    .prepare('SELECT id, slug, name, summary, visibility, tags_json, created_at FROM projects ORDER BY created_at DESC')
    .all() as ProjectRow[];

  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    summary: r.summary,
    visibility: (r.visibility === 'restricted' ? 'restricted' : 'open') as Visibility,
    tags: JSON.parse(r.tags_json || '[]') as string[],
    createdAt: r.created_at,
    files: [],
    proposals: [],
    activity: [],
    members: [],
    joinRequests: [],
  }));
}

export function getProject(slug: string) {
  const db = getDb();
  const p = getProjectBySlug(slug);
  if (!p) return null;

  const files = (db
    .prepare('SELECT path, content, updated_at FROM project_files WHERE project_id=? ORDER BY path ASC')
    .all(p.id) as FileRow[]).map((f) => ({ path: f.path, content: f.content, updatedAt: f.updated_at }));

  const proposals = (db
    .prepare('SELECT id, title, author_handle, author_type, created_at, status, summary, file_path FROM proposals WHERE project_id=? ORDER BY created_at DESC')
    .all(p.id) as Array<Pick<ProposalRow, 'id' | 'title' | 'author_handle' | 'author_type' | 'created_at' | 'status' | 'summary' | 'file_path'>>).map((pr) => ({
    id: pr.id,
    title: pr.title,
    authorHandle: pr.author_handle,
    authorType: (pr.author_type === 'agent' ? 'agent' : 'human') as MemberType,
    createdAt: pr.created_at,
    status: pr.status as ProposalStatus,
    summary: pr.summary,
    filePath: pr.file_path,
  }));

  const activity = (db
    .prepare('SELECT ts, text FROM activity WHERE project_id=? ORDER BY ts DESC LIMIT 50')
    .all(p.id) as ActivityRow[]).map((a) => ({ ts: a.ts, text: a.text }));

  const members = (db
    .prepare('SELECT member_handle, member_type, role, joined_at FROM project_members WHERE project_id=? ORDER BY role ASC, member_handle ASC')
    .all(p.id) as MemberRow[]).map((m) => ({
    handle: m.member_handle,
    memberType: (m.member_type === 'agent' ? 'agent' : 'human') as MemberType,
    role: (m.role as MemberRole) || 'contributor',
    joinedAt: m.joined_at,
  }));

  const joinRequests = (db
    .prepare(
      'SELECT id, member_handle, member_type, requested_at, status, reviewed_by, reviewed_at FROM join_requests WHERE project_id=? ORDER BY requested_at DESC'
    )
    .all(p.id) as JoinRequestRow[]).map((r) => ({
    id: r.id,
    handle: r.member_handle,
    memberType: (r.member_type === 'agent' ? 'agent' : 'human') as MemberType,
    requestedAt: r.requested_at,
    status: r.status as JoinRequestStatus,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
  }));

  return {
    slug: p.slug,
    name: p.name,
    summary: p.summary,
    visibility: (p.visibility === 'restricted' ? 'restricted' : 'open') as Visibility,
    tags: JSON.parse(p.tags_json || '[]') as string[],
    createdAt: p.created_at,
    files,
    proposals,
    activity,
    members,
    joinRequests,
  };
}

export function createProject(args: { name: string; slug?: string; summary: string; visibility: Visibility; actorHandle: string; actorType: MemberType }) {
  const db = getDb();
  const slug = args.slug && args.slug.trim() ? slugify(args.slug) : slugify(args.name);
  if (!slug) throw new Error('invalid_slug');

  const now = nowIso();
  const tx = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO projects (slug, name, summary, visibility, tags_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(slug, args.name.trim(), args.summary.trim() || 'No summary', args.visibility, JSON.stringify(['new']), now);

    const projectId = Number(info.lastInsertRowid);

    const files = [
      { path: 'README.md', content: `# ${args.name.trim()}\n\n${(args.summary || '').trim()}\n` },
      { path: 'DECISIONS.md', content: '# Decisions\n\n- (empty)\n' },
      { path: 'TODO.md', content: '# TODO\n\n- (empty)\n' },
    ];

    const ins = db.prepare('INSERT INTO project_files (project_id, path, content, updated_at) VALUES (?, ?, ?, ?)');
    for (const f of files) ins.run(projectId, f.path, f.content, now);

    db.prepare('INSERT INTO project_members (project_id, member_handle, member_type, role, joined_at) VALUES (?, ?, ?, ?, ?)').run(
      projectId,
      args.actorHandle,
      args.actorType,
      'owner',
      now
    );

    db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(
      projectId,
      now,
      `Project created (${args.visibility}) by @${args.actorHandle}`
    );
  });

  tx();
  return getProject(slug);
}

export function createProposal(args: {
  projectSlug: string;
  title: string;
  summary: string;
  authorHandle: string;
  authorType: MemberType;
  filePath: string;
  newContent: string;
}) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');

  const id = `p-${Math.random().toString(16).slice(2, 6)}${Date.now().toString(16).slice(-4)}`;
  const created = nowIso().slice(0, 10);

  db.prepare(
    'INSERT INTO proposals (id, project_id, title, author_handle, author_type, created_at, status, summary, file_path, new_content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    p.id,
    args.title.trim() || 'Untitled proposal',
    args.authorHandle || 'baseline',
    args.authorType === 'agent' ? 'agent' : 'human',
    created,
    'needs_review',
    args.summary.trim() || 'No summary',
    args.filePath,
    args.newContent
  );

  db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(p.id, nowIso(), `Proposal opened: ${id} (${args.filePath})`);

  return getProposal(id);
}

export function getProposal(id: string) {
  const db = getDb();
  const pr = db
    .prepare('SELECT id, project_id, title, author_handle, author_type, created_at, status, summary, file_path, new_content FROM proposals WHERE id=?')
    .get(id) as ProposalRow | undefined;
  if (!pr) return null;

  const project = db.prepare('SELECT slug FROM projects WHERE id=?').get(pr.project_id) as { slug: string } | undefined;

  return {
    id: pr.id,
    projectSlug: project?.slug || 'unknown',
    title: pr.title,
    authorHandle: pr.author_handle,
    authorType: (pr.author_type === 'agent' ? 'agent' : 'human') as MemberType,
    createdAt: pr.created_at,
    status: pr.status as ProposalStatus,
    summary: pr.summary,
    filePath: pr.file_path,
    newContent: pr.new_content,
  };
}

export function proposalAction(args: {
  id: string;
  action: 'approve' | 'request_changes' | 'reject' | 'merge';
  actorHandle?: string;
  actorType?: MemberType;
  note?: string;
}) {
  const db = getDb();
  const prRow = db
    .prepare('SELECT id, project_id, file_path, new_content, status FROM proposals WHERE id=?')
    .get(args.id) as { id: string; project_id: number; file_path: string; new_content: string; status: string } | undefined;
  if (!prRow) throw new Error('proposal_not_found');

  const now = nowIso();
  const actorHandle = args.actorHandle || 'reviewer';
  const actorType = args.actorType === 'agent' ? 'agent' : 'human';

  const tx = db.transaction(() => {
    if (args.action === 'approve') {
      db.prepare('UPDATE proposals SET status=? WHERE id=?').run('approved', args.id);
      db.prepare('INSERT INTO reviews (proposal_id, action, actor_handle, actor_type, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        args.id,
        'approve',
        actorHandle,
        actorType,
        args.note || null,
        now
      );
      db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(
        prRow.project_id,
        now,
        `Proposal approved: ${args.id} by @${actorHandle} (${actorType})`
      );
    }

    if (args.action === 'request_changes') {
      db.prepare('UPDATE proposals SET status=? WHERE id=?').run('changes_requested', args.id);
      db.prepare('INSERT INTO reviews (proposal_id, action, actor_handle, actor_type, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        args.id,
        'request_changes',
        actorHandle,
        actorType,
        args.note || null,
        now
      );
      db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(
        prRow.project_id,
        now,
        `Changes requested: ${args.id} by @${actorHandle} (${actorType})`
      );
    }

    if (args.action === 'reject') {
      db.prepare('UPDATE proposals SET status=? WHERE id=?').run('rejected', args.id);
      db.prepare('INSERT INTO reviews (proposal_id, action, actor_handle, actor_type, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        args.id,
        'reject',
        actorHandle,
        actorType,
        args.note || null,
        now
      );
      db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(
        prRow.project_id,
        now,
        `Proposal rejected: ${args.id} by @${actorHandle} (${actorType})`
      );
    }

    if (args.action === 'merge') {
      const status = db.prepare('SELECT status FROM proposals WHERE id=?').get(args.id) as { status: string } | undefined;
      if (!status) throw new Error('proposal_not_found');
      if (status.status !== 'approved') throw new Error('merge_requires_approval');

      db.prepare(
        'INSERT INTO project_files (project_id, path, content, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(project_id, path) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at'
      ).run(prRow.project_id, prRow.file_path, prRow.new_content, now);

      db.prepare('UPDATE proposals SET status=? WHERE id=?').run('merged', args.id);
      db.prepare('INSERT INTO reviews (proposal_id, action, actor_handle, actor_type, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        args.id,
        'merge',
        actorHandle,
        actorType,
        args.note || null,
        now
      );
      db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(
        prRow.project_id,
        now,
        `Merged ${args.id} into ${prRow.file_path} by @${actorHandle} (${actorType})`
      );
    }
  });

  tx();
  return getProposal(args.id);
}

function isProjectOwnerOrMaintainer(projectId: number, handle: string) {
  const db = getDb();
  const row = db
    .prepare('SELECT role FROM project_members WHERE project_id=? AND member_handle=?')
    .get(projectId, handle) as { role: string } | undefined;
  return row?.role === 'owner' || row?.role === 'maintainer';
}

export function joinProject(args: { projectSlug: string; actorHandle: string; actorType: MemberType }) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');

  const now = nowIso();

  // Already a member?
  const existing = db
    .prepare('SELECT role FROM project_members WHERE project_id=? AND member_handle=?')
    .get(p.id, args.actorHandle) as { role: string } | undefined;
  if (existing) return { mode: 'already_member' as const, role: existing.role as MemberRole };

  if ((p.visibility === 'restricted' ? 'restricted' : 'open') === 'open') {
    db.prepare('INSERT INTO project_members (project_id, member_handle, member_type, role, joined_at) VALUES (?, ?, ?, ?, ?)').run(
      p.id,
      args.actorHandle,
      args.actorType,
      'contributor',
      now
    );
    db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(p.id, now, `@${args.actorHandle} joined (open)`);
    return { mode: 'joined' as const, role: 'contributor' as const };
  }

  const id = `jr-${Math.random().toString(16).slice(2, 6)}${Date.now().toString(16).slice(-4)}`;
  db.prepare(
    'INSERT INTO join_requests (id, project_id, member_handle, member_type, requested_at, status, reviewed_by, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, p.id, args.actorHandle, args.actorType, now, 'pending', null, null);
  db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(p.id, now, `@${args.actorHandle} requested access`);
  return { mode: 'requested' as const, requestId: id };
}

export function reviewJoinRequest(args: {
  requestId: string;
  action: 'approve' | 'reject';
  actorHandle: string;
}) {
  const db = getDb();
  const r = db
    .prepare('SELECT id, project_id, member_handle, member_type, status FROM join_requests WHERE id=?')
    .get(args.requestId) as { id: string; project_id: number; member_handle: string; member_type: string; status: string } | undefined;
  if (!r) throw new Error('request_not_found');
  if (r.status !== 'pending') throw new Error('request_not_pending');

  if (!isProjectOwnerOrMaintainer(r.project_id, args.actorHandle)) throw new Error('not_allowed');

  const now = nowIso();

  const tx = db.transaction(() => {
    if (args.action === 'approve') {
      db.prepare('UPDATE join_requests SET status=?, reviewed_by=?, reviewed_at=? WHERE id=?').run('approved', args.actorHandle, now, r.id);
      db.prepare('INSERT INTO project_members (project_id, member_handle, member_type, role, joined_at) VALUES (?, ?, ?, ?, ?)').run(
        r.project_id,
        r.member_handle,
        r.member_type === 'agent' ? 'agent' : 'human',
        'contributor',
        now
      );
      db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(r.project_id, now, `Access approved for @${r.member_handle}`);
    }

    if (args.action === 'reject') {
      db.prepare('UPDATE join_requests SET status=?, reviewed_by=?, reviewed_at=? WHERE id=?').run('rejected', args.actorHandle, now, r.id);
      db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(r.project_id, now, `Access rejected for @${r.member_handle}`);
    }
  });

  tx();
  return { ok: true };
}
