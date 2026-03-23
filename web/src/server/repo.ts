import { getDb } from './db';
import crypto from 'node:crypto';

export type Visibility = 'open' | 'restricted';
export type ProposalStatus = 'needs_review' | 'approved' | 'changes_requested' | 'rejected' | 'merged';

export type MemberType = 'human' | 'agent';
export type MemberRole = 'owner' | 'maintainer' | 'contributor';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export type IdentityType = MemberType;
export type ClaimState = 'unclaimed' | 'claimed';

export type User = {
  id: number;
  handle: string;
  displayName: string | null;
  createdAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

function newToken(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

function normalizeUserHandle(input: string) {
  return slugify(input).replace(/-/g, '_');
}

export function listUsers(): User[] {
  const db = getDb();

  // Ensure at least one default user exists for the minimal identity layer.
  if (!getUserByHandle('local-human')) {
    const now = nowIso();
    db.prepare('INSERT INTO users (handle, display_name, created_at) VALUES (?, ?, ?)').run('local-human', 'Local Human', now);
    ensureIdentity('local-human', 'human');
    const u = getUserByHandle('local-human');
    if (u) db.prepare('UPDATE identities SET user_id=? WHERE handle=?').run(u.id, 'local-human');
  }

  const rows = db.prepare('SELECT id, handle, display_name, created_at FROM users ORDER BY created_at DESC').all() as Array<{
    id: number;
    handle: string;
    display_name: string | null;
    created_at: string;
  }>;
  return rows.map((r) => ({ id: r.id, handle: r.handle, displayName: r.display_name ?? null, createdAt: r.created_at }));
}

export function getUserByHandle(handle: string): User | null {
  const db = getDb();
  const r = db.prepare('SELECT id, handle, display_name, created_at FROM users WHERE handle=?').get(handle) as
    | { id: number; handle: string; display_name: string | null; created_at: string }
    | undefined;
  if (!r) return null;
  return { id: r.id, handle: r.handle, displayName: r.display_name ?? null, createdAt: r.created_at };
}

export function createUser(args: { handle: string; displayName?: string | null }): User {
  const db = getDb();
  const now = nowIso();
  const handle = normalizeUserHandle(args.handle);
  if (!handle) throw new Error('invalid_handle');

  db.prepare('INSERT INTO users (handle, display_name, created_at) VALUES (?, ?, ?)').run(handle, args.displayName || null, now);

  // Ensure the corresponding human identity exists and is linked.
  ensureIdentity(handle, 'human');
  const u = getUserByHandle(handle);
  if (u) db.prepare('UPDATE identities SET user_id=? WHERE handle=?').run(u.id, handle);

  return u || { id: -1, handle, displayName: args.displayName || null, createdAt: now };
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

type FileRow = {
  path: string;
  content: string;
  updated_at: string;
  last_actor_handle?: string | null;
  last_actor_type?: string | null;
  last_proposal_id?: string | null;
};

type ProposalRow = {
  id: string;
  project_id: number;
  title: string;
  author_handle: string;
  author_type?: string;
  created_at: string;
  updated_at?: string | null;
  status: string;
  summary: string;
  file_path: string;
  new_content: string;
  task_id?: string | null;
};

type ActivityRow = { ts: string; text: string };

type TaskRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  claimed_by_handle: string | null;
  claimed_by_type: string | null;
  created_at: string;
  updated_at: string;
  file_path: string | null;
};

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
  ensureDogfoodA2aSiteProject();
  ensureShowcaseDemoProject();
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
    .prepare('SELECT path, content, updated_at, last_actor_handle, last_actor_type, last_proposal_id FROM project_files WHERE project_id=? ORDER BY path ASC')
    .all(p.id) as FileRow[]).map((f) => ({
    path: f.path,
    content: f.content,
    updatedAt: f.updated_at,
    lastActorHandle: f.last_actor_handle || null,
    lastActorType: f.last_actor_type === 'agent' ? ('agent' as MemberType) : f.last_actor_type === 'human' ? ('human' as MemberType) : null,
    lastProposalId: f.last_proposal_id || null,
  }));

  const lastReviewStmt = db.prepare(
    'SELECT action, actor_handle, actor_type, created_at FROM reviews WHERE proposal_id=? ORDER BY id DESC LIMIT 1'
  );

  const proposalRows = db
    .prepare(
      'SELECT id, title, author_handle, author_type, created_at, status, summary, file_path FROM proposals WHERE project_id=? ORDER BY created_at DESC'
    )
    .all(p.id) as Array<Pick<ProposalRow, 'id' | 'title' | 'author_handle' | 'author_type' | 'created_at' | 'status' | 'summary' | 'file_path'>>;

  const proposals = proposalRows.map((pr) => {
    const lr = lastReviewStmt.get(pr.id) as
      | { action: string; actor_handle: string | null; actor_type: string | null; created_at: string }
      | undefined;

    return {
      id: pr.id,
      title: pr.title,
      authorHandle: pr.author_handle,
      authorType: (pr.author_type === 'agent' ? 'agent' : 'human') as MemberType,
      createdAt: pr.created_at,
      status: pr.status as ProposalStatus,
      summary: pr.summary,
      filePath: pr.file_path,
      lastReview: lr
        ? {
            action: lr.action,
            actorHandle: lr.actor_handle,
            actorType: lr.actor_type === 'agent' ? ('agent' as MemberType) : lr.actor_type === 'human' ? ('human' as MemberType) : null,
            createdAt: lr.created_at,
          }
        : null,
    };
  });

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

  const tasks = (db
    .prepare(
      'SELECT id, title, description, status, claimed_by_handle, claimed_by_type, created_at, updated_at, file_path FROM tasks WHERE project_id=? ORDER BY updated_at DESC'
    )
    .all(p.id) as TaskRow[]).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    claimedByHandle: t.claimed_by_handle,
    claimedByType: t.claimed_by_type === 'agent' ? 'agent' : t.claimed_by_type === 'human' ? 'human' : null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    filePath: t.file_path,
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
    tasks,
  };
}

export function createProject(args: { name: string; slug?: string; summary: string; visibility: Visibility; actorHandle: string; actorType: MemberType }) {
  const db = getDb();
  const slug = args.slug && args.slug.trim() ? slugify(args.slug) : slugify(args.name);
  if (!slug) throw new Error('invalid_slug');

  const now = nowIso();
  ensureIdentity(args.actorHandle, args.actorType);
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

    const ins = db.prepare(
      'INSERT INTO project_files (project_id, path, content, updated_at, last_actor_handle, last_actor_type, last_proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const f of files) ins.run(projectId, f.path, f.content, now, args.actorHandle, args.actorType, null);

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

export type Task = {
  id: string;
  projectSlug: string;
  title: string;
  description: string;
  status: 'open' | 'claimed' | 'in_progress' | 'completed';
  claimedByHandle: string | null;
  claimedByType: MemberType | null;
  createdAt: string;
  updatedAt: string;
  filePath: string | null;
};

export function listTasksForProject(projectSlug: string): Task[] {
  const db = getDb();
  const p = getProjectBySlug(projectSlug);
  if (!p) return [];

  const rows = db
    .prepare(
      'SELECT id, title, description, status, claimed_by_handle, claimed_by_type, created_at, updated_at, file_path FROM tasks WHERE project_id=? ORDER BY updated_at DESC'
    )
    .all(p.id) as TaskRow[];

  return rows.map((t) => ({
    id: t.id,
    projectSlug,
    title: t.title,
    description: t.description,
    status: (t.status as 'open' | 'claimed' | 'in_progress' | 'completed') || 'open',
    claimedByHandle: t.claimed_by_handle,
    claimedByType: t.claimed_by_type === 'agent' ? 'agent' : t.claimed_by_type === 'human' ? 'human' : null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    filePath: t.file_path,
  }));
}

export function createTask(args: {
  projectSlug: string;
  title: string;
  description?: string;
  filePath?: string | null;
  actorHandle: string;
  actorType: MemberType;
}): Task {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');

  ensureIdentity(args.actorHandle, args.actorType);

  const now = nowIso();
  const id = `t-${Math.random().toString(16).slice(2, 6)}${Date.now().toString(16).slice(-4)}`;

  db.prepare(
    'INSERT INTO tasks (id, project_id, title, description, status, claimed_by_handle, claimed_by_type, created_at, updated_at, file_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, p.id, args.title.trim() || 'Untitled task', args.description?.trim() || '', 'open', null, null, now, now, args.filePath || null);

  db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id,
    now,
    args.actorHandle,
    args.actorType,
    'created',
    args.title.trim() || 'Untitled task',
    null
  );

  db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(
    p.id,
    now,
    `Task created: ${id} by @${args.actorHandle} (${args.actorType})`
  );

  return {
    id,
    projectSlug: args.projectSlug,
    title: args.title.trim() || 'Untitled task',
    description: args.description?.trim() || '',
    status: 'open',
    claimedByHandle: null,
    claimedByType: null,
    createdAt: now,
    updatedAt: now,
    filePath: args.filePath || null,
  };
}

export function taskAction(args: {
  taskId: string;
  action: 'claim' | 'unclaim' | 'start' | 'complete';
  actorHandle: string;
  actorType: MemberType;
}) {
  const db = getDb();
  const t = db.prepare('SELECT id, project_id FROM tasks WHERE id=?').get(args.taskId) as { id: string; project_id: number } | undefined;
  if (!t) throw new Error('task_not_found');

  ensureIdentity(args.actorHandle, args.actorType);

  const now = nowIso();

  const tx = db.transaction(() => {
    if (args.action === 'claim') {
      db.prepare('UPDATE tasks SET status=?, claimed_by_handle=?, claimed_by_type=?, updated_at=? WHERE id=?').run(
        'claimed',
        args.actorHandle,
        args.actorType,
        now,
        args.taskId
      );
    }

    if (args.action === 'unclaim') {
      db.prepare('UPDATE tasks SET status=?, claimed_by_handle=?, claimed_by_type=?, updated_at=? WHERE id=?').run('open', null, null, now, args.taskId);
    }

    if (args.action === 'start') {
      db.prepare('UPDATE tasks SET status=?, claimed_by_handle=?, claimed_by_type=?, updated_at=? WHERE id=?').run(
        'in_progress',
        args.actorHandle,
        args.actorType,
        now,
        args.taskId
      );
    }

    if (args.action === 'complete') {
      db.prepare('UPDATE tasks SET status=?, updated_at=? WHERE id=?').run('completed', now, args.taskId);
    }

    db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      args.taskId,
      now,
      args.actorHandle,
      args.actorType,
      args.action,
      null,
      null
    );

    db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(
      t.project_id,
      now,
      `Task ${args.action}: ${args.taskId} by @${args.actorHandle} (${args.actorType})`
    );
  });

  tx();
  return { ok: true };
}

export type TaskEvent = {
  ts: string;
  actorHandle: string | null;
  actorType: MemberType | null;
  kind: string;
  note: string | null;
  proposalId: string | null;
};

export function getTask(taskId: string): Task | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT t.id, t.title, t.description, t.status, t.claimed_by_handle, t.claimed_by_type, t.created_at, t.updated_at, t.file_path,
              p.slug as project_slug
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.id=?`
    )
    .get(taskId) as
    | {
        id: string;
        title: string;
        description: string;
        status: string;
        claimed_by_handle: string | null;
        claimed_by_type: string | null;
        created_at: string;
        updated_at: string;
        file_path: string | null;
        project_slug: string;
      }
    | undefined;
  if (!row) return null;

  return {
    id: row.id,
    projectSlug: row.project_slug,
    title: row.title,
    description: row.description,
    status: (row.status as 'open' | 'claimed' | 'in_progress' | 'completed') || 'open',
    claimedByHandle: row.claimed_by_handle,
    claimedByType: row.claimed_by_type === 'agent' ? 'agent' : row.claimed_by_type === 'human' ? 'human' : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    filePath: row.file_path,
  };
}

export function listTaskEvents(taskId: string): TaskEvent[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT ts, actor_handle, actor_type, kind, note, proposal_id FROM task_events WHERE task_id=? ORDER BY id ASC')
    .all(taskId) as Array<{
    ts: string;
    actor_handle: string | null;
    actor_type: string | null;
    kind: string;
    note: string | null;
    proposal_id: string | null;
  }>;

  return rows.map((r) => ({
    ts: r.ts,
    actorHandle: r.actor_handle,
    actorType: r.actor_type === 'agent' ? 'agent' : r.actor_type === 'human' ? 'human' : null,
    kind: r.kind,
    note: r.note,
    proposalId: r.proposal_id,
  }));
}

export function createProposal(args: {
  projectSlug: string;
  title: string;
  summary: string;
  authorHandle: string;
  authorType: MemberType;
  filePath: string;
  newContent: string;
  taskId?: string | null;
}) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');

  const id = `p-${Math.random().toString(16).slice(2, 6)}${Date.now().toString(16).slice(-4)}`;
  const created = nowIso().slice(0, 10);

  ensureIdentity(args.authorHandle || 'baseline', args.authorType);

  db.prepare(
    'INSERT INTO proposals (id, project_id, title, author_handle, author_type, created_at, updated_at, status, summary, file_path, new_content, task_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    p.id,
    args.title.trim() || 'Untitled proposal',
    args.authorHandle || 'baseline',
    args.authorType === 'agent' ? 'agent' : 'human',
    created,
    nowIso(),
    'needs_review',
    args.summary.trim() || 'No summary',
    args.filePath,
    args.newContent,
    args.taskId || null
  );

  db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(p.id, nowIso(), `Proposal opened: ${id} (${args.filePath})`);

  return getProposal(id);
}

export function getProposal(id: string) {
  const db = getDb();
  const pr = db
    .prepare('SELECT id, project_id, title, author_handle, author_type, created_at, updated_at, status, summary, file_path, new_content, task_id FROM proposals WHERE id=?')
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
    updatedAt: pr.updated_at || pr.created_at,
    status: pr.status as ProposalStatus,
    summary: pr.summary,
    filePath: pr.file_path,
    newContent: pr.new_content,
    taskId: pr.task_id || null,
  };
}

export type ProposalReviewEvent = {
  action: string;
  actorHandle: string | null;
  actorType: MemberType | null;
  note: string | null;
  createdAt: string;
};

export function listProposalReviews(proposalId: string): ProposalReviewEvent[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT action, actor_handle, actor_type, note, created_at FROM reviews WHERE proposal_id=? ORDER BY id ASC')
    .all(proposalId) as Array<{ action: string; actor_handle: string | null; actor_type: string | null; note: string | null; created_at: string }>;

  return rows.map((r) => ({
    action: r.action,
    actorHandle: r.actor_handle,
    actorType: r.actor_type === 'agent' ? 'agent' : r.actor_type === 'human' ? 'human' : null,
    note: r.note,
    createdAt: r.created_at,
  }));
}

export function updateProposal(args: {
  id: string;
  actorHandle: string;
  actorType: MemberType;
  newContent: string;
  summary: string;
  note?: string | null;
}) {
  const db = getDb();
  const pr = db
    .prepare('SELECT id, project_id, author_handle FROM proposals WHERE id=?')
    .get(args.id) as { id: string; project_id: number; author_handle: string } | undefined;
  if (!pr) throw new Error('proposal_not_found');
  if (pr.author_handle !== args.actorHandle) throw new Error('not_author');

  ensureIdentity(args.actorHandle, args.actorType);

  const now = nowIso();
  db.prepare('UPDATE proposals SET new_content=?, summary=?, status=?, updated_at=? WHERE id=?').run(
    args.newContent,
    args.summary,
    'needs_review',
    now,
    args.id
  );

  db.prepare('INSERT INTO reviews (proposal_id, action, actor_handle, actor_type, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    args.id,
    'update',
    args.actorHandle,
    args.actorType,
    args.note || null,
    now
  );

  db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(
    pr.project_id,
    now,
    `Proposal updated: ${args.id} by @${args.actorHandle} (${args.actorType})`
  );

  return getProposal(args.id);
}

export function proposalAction(args: {
  id: string;
  action: 'approve' | 'request_changes' | 'reject' | 'merge' | 'comment';
  actorHandle?: string;
  actorType?: MemberType;
  note?: string;
}) {
  const db = getDb();
  const prRow = db
    .prepare('SELECT id, project_id, file_path, new_content, status, task_id FROM proposals WHERE id=?')
    .get(args.id) as { id: string; project_id: number; file_path: string; new_content: string; status: string; task_id: string | null } | undefined;
  if (!prRow) throw new Error('proposal_not_found');

  const now = nowIso();
  const actorHandle = args.actorHandle || 'reviewer';
  const actorType = args.actorType === 'agent' ? 'agent' : 'human';
  ensureIdentity(actorHandle, actorType);

  const tx = db.transaction(() => {
    if (args.action === 'comment') {
      db.prepare('INSERT INTO reviews (proposal_id, action, actor_handle, actor_type, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        args.id,
        'comment',
        actorHandle,
        actorType,
        args.note || null,
        now
      );
      db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(
        prRow.project_id,
        now,
        `Proposal comment: ${args.id} by @${actorHandle} (${actorType})`
      );
      return;
    }

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
        'INSERT INTO project_files (project_id, path, content, updated_at, last_actor_handle, last_actor_type, last_proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(project_id, path) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at, last_actor_handle=excluded.last_actor_handle, last_actor_type=excluded.last_actor_type, last_proposal_id=excluded.last_proposal_id'
      ).run(prRow.project_id, prRow.file_path, prRow.new_content, now, actorHandle, actorType, args.id);

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

      if (prRow.task_id) {
        db.prepare('UPDATE tasks SET status=?, updated_at=? WHERE id=?').run('completed', now, prRow.task_id);
        db.prepare(
          'INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(prRow.task_id, now, actorHandle, actorType, 'merged', `Merged via proposal ${args.id}`, args.id);
      }
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
  ensureIdentity(args.actorHandle, args.actorType);

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
  role?: MemberRole;
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
        args.role || 'contributor',
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

export type Identity = {
  handle: string;
  identityType: IdentityType;
  displayName: string | null;
  ownerHandle: string | null;
  ownerUserId?: number | null;
  userId?: number | null;
  claimState: ClaimState;
  origin?: 'local' | 'openclaw';
  claimToken?: string | null;
  bindingToken?: string | null;
  boundAt?: string | null;
  createdAt: string;
};

function ensureIdentity(handle: string, identityType: IdentityType) {
  const db = getDb();
  const now = nowIso();
  db.prepare(
    "INSERT INTO identities (handle, identity_type, display_name, owner_handle, claim_state, origin, claim_token, binding_token, bound_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(handle) DO NOTHING"
  ).run(
    handle,
    identityType,
    null,
    null,
    identityType === 'agent' ? 'unclaimed' : 'claimed',
    'local',
    identityType === 'agent' ? newToken(8) : null,
    null,
    null,
    now
  );

  // Backfill for older rows (additive migrations).
  db.prepare("UPDATE identities SET origin=COALESCE(origin, 'local') WHERE handle=?").run(handle);
  if (identityType === 'agent') {
    db.prepare('UPDATE identities SET claim_token=COALESCE(claim_token, ?) WHERE handle=?').run(newToken(8), handle);
  }
  if (identityType === 'human') {
    const u = getUserByHandle(handle);
    if (u) db.prepare('UPDATE identities SET user_id=COALESCE(user_id, ?) WHERE handle=?').run(u.id, handle);
  }
}

export function listIdentities(): Identity[] {
  const db = getDb();

  // Ensure defaults exist.
  ensureIdentity('local-human', 'human');
  ensureIdentity('local-agent', 'agent');

  const rows = db
    .prepare('SELECT handle, identity_type, display_name, owner_handle, owner_user_id, user_id, claim_state, origin, claim_token, binding_token, bound_at, created_at FROM identities ORDER BY created_at DESC')
    .all() as Array<{
    handle: string;
    identity_type: string;
    display_name: string | null;
    owner_handle: string | null;
    owner_user_id?: number | null;
    user_id?: number | null;
    claim_state: string;
    origin?: string | null;
    claim_token?: string | null;
    binding_token?: string | null;
    bound_at?: string | null;
    created_at: string;
  }>;

  return rows.map((r) => ({
    handle: r.handle,
    identityType: r.identity_type === 'agent' ? 'agent' : 'human',
    displayName: r.display_name ?? null,
    ownerHandle: r.owner_handle ?? null,
    ownerUserId: r.owner_user_id ?? null,
    userId: r.user_id ?? null,
    claimState: r.claim_state === 'claimed' ? 'claimed' : 'unclaimed',
    origin: r.origin === 'openclaw' ? 'openclaw' : 'local',
    claimToken: r.claim_token ?? null,
    bindingToken: r.binding_token ?? null,
    boundAt: r.bound_at ?? null,
    createdAt: r.created_at,
  }));
}

export function getIdentity(handle: string): Identity | null {
  const db = getDb();
  const r = db
    .prepare('SELECT handle, identity_type, display_name, owner_handle, owner_user_id, user_id, claim_state, origin, claim_token, binding_token, bound_at, created_at FROM identities WHERE handle=?')
    .get(handle) as
    | {
        handle: string;
        identity_type: string;
        display_name: string | null;
        owner_handle: string | null;
        owner_user_id?: number | null;
        user_id?: number | null;
        claim_state: string;
        origin?: string | null;
        claim_token?: string | null;
        binding_token?: string | null;
        bound_at?: string | null;
        created_at: string;
      }
    | undefined;
  if (!r) return null;
  return {
    handle: r.handle,
    identityType: r.identity_type === 'agent' ? 'agent' : 'human',
    displayName: r.display_name ?? null,
    ownerHandle: r.owner_handle ?? null,
    ownerUserId: r.owner_user_id ?? null,
    userId: r.user_id ?? null,
    claimState: r.claim_state === 'claimed' ? 'claimed' : 'unclaimed',
    origin: r.origin === 'openclaw' ? 'openclaw' : 'local',
    claimToken: r.claim_token ?? null,
    bindingToken: r.binding_token ?? null,
    boundAt: r.bound_at ?? null,
    createdAt: r.created_at,
  };
}

export function createAgentIdentity(args: { handle: string; displayName?: string | null }) {
  const db = getDb();
  const now = nowIso();
  const handle = slugify(args.handle).replace(/-/g, '_');
  if (!handle) throw new Error('invalid_handle');

  db.prepare(
    "INSERT INTO identities (handle, identity_type, display_name, owner_handle, claim_state, origin, claim_token, binding_token, bound_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(handle, 'agent', args.displayName || null, null, 'unclaimed', 'local', newToken(8), null, null, now);

  return getIdentity(handle);
}

export function claimAgentIdentity(args: { handle: string; ownerHandle: string }) {
  const db = getDb();
  const ownerHandle = normalizeUserHandle(args.ownerHandle);
  const id = getIdentity(args.handle);
  if (!id) throw new Error('identity_not_found');
  if (id.identityType !== 'agent') throw new Error('not_an_agent');

  ensureIdentity(ownerHandle, 'human');

  // Ensure the owning human is grounded in a real user record.
  const u = getUserByHandle(ownerHandle) || createUser({ handle: ownerHandle });

  db.prepare('UPDATE identities SET claim_state=?, owner_handle=?, owner_user_id=? WHERE handle=?').run(
    'claimed',
    ownerHandle,
    u.id,
    args.handle
  );

  return getIdentity(args.handle);
}

function normalizeHandle(input: string) {
  return slugify(input).replace(/-/g, '_');
}

export type AgentRuntime = {
  agentHandle: string;
  runtime: Record<string, unknown>;
  lastSeen: string;
};

export function upsertAgentRuntime(args: { agentHandle: string; runtime: Record<string, unknown> }) {
  const db = getDb();
  const now = nowIso();

  ensureIdentity(args.agentHandle, 'agent');

  db.prepare(
    `INSERT INTO agent_runtime (agent_handle, runtime_json, last_seen)
     VALUES (?, ?, ?)
     ON CONFLICT(agent_handle) DO UPDATE SET runtime_json=excluded.runtime_json, last_seen=excluded.last_seen`
  ).run(args.agentHandle, JSON.stringify(args.runtime || {}), now);

  return getAgentRuntime(args.agentHandle);
}

export function getAgentRuntime(agentHandle: string): AgentRuntime | null {
  const db = getDb();
  const r = db
    .prepare('SELECT agent_handle, runtime_json, last_seen FROM agent_runtime WHERE agent_handle=?')
    .get(agentHandle) as { agent_handle: string; runtime_json: string; last_seen: string } | undefined;
  if (!r) return null;
  let runtime: Record<string, unknown> = {};
  try {
    runtime = JSON.parse(r.runtime_json || '{}');
  } catch {
    runtime = {};
  }
  return { agentHandle: r.agent_handle, runtime, lastSeen: r.last_seen };
}

export function updateAgentRuntimeWithBindingToken(args: {
  agentHandle: string;
  bindingToken: string;
  runtime: Record<string, unknown>;
}) {
  const id = getIdentity(args.agentHandle);
  if (!id) throw new Error('identity_not_found');
  if (id.identityType !== 'agent') throw new Error('not_an_agent');
  if (!id.bindingToken) throw new Error('agent_not_bound');
  if (id.bindingToken !== args.bindingToken) throw new Error('invalid_binding_token');

  return upsertAgentRuntime({ agentHandle: args.agentHandle, runtime: args.runtime || {} });
}

export type AgentSummary = {
  handle: string;
  projects: Array<{ slug: string; name: string; role: MemberRole; joinedAt: string }>;
  claimedTasks: Array<{ id: string; title: string; status: string; projectSlug: string }>;
  proposals: Array<{ id: string; title: string; status: string; projectSlug: string; createdAt: string }>;
};

export function getAgentSummary(args: { handle: string }): AgentSummary {
  const db = getDb();
  const handle = args.handle;

  const projects = db
    .prepare(
      `SELECT p.slug AS slug, p.name AS name, pm.role AS role, pm.joined_at AS joined_at
       FROM project_members pm
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.member_handle=? AND pm.member_type='agent'
       ORDER BY pm.joined_at DESC`
    )
    .all(handle) as Array<{ slug: string; name: string; role: MemberRole; joined_at: string }>;

  const claimedTasks = db
    .prepare(
      `SELECT t.id AS id, t.title AS title, t.status AS status, p.slug AS project_slug
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.claimed_by_handle=? AND t.claimed_by_type='agent'
       ORDER BY t.updated_at DESC
       LIMIT 10`
    )
    .all(handle) as Array<{ id: string; title: string; status: string; project_slug: string }>;

  const proposals = db
    .prepare(
      `SELECT pr.id AS id, pr.title AS title, pr.status AS status, p.slug AS project_slug, pr.created_at AS created_at
       FROM proposals pr
       JOIN projects p ON p.id = pr.project_id
       WHERE pr.author_handle=? AND pr.author_type='agent'
       ORDER BY pr.created_at DESC
       LIMIT 10`
    )
    .all(handle) as Array<{ id: string; title: string; status: string; project_slug: string; created_at: string }>;

  return {
    handle,
    projects: projects.map((r) => ({ slug: r.slug, name: r.name, role: r.role, joinedAt: r.joined_at })),
    claimedTasks: claimedTasks.map((r) => ({ id: r.id, title: r.title, status: r.status, projectSlug: r.project_slug })),
    proposals: proposals.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      projectSlug: r.project_slug,
      createdAt: r.created_at,
    })),
  };
}

export function externalAgentIntake(args: {
  agentHandle: string;
  displayName?: string | null;
  projectSlug: string;
  runtime?: Record<string, unknown> | null;
}) {
  const db = getDb();

  const handle = normalizeHandle(args.agentHandle);
  if (!handle) throw new Error('invalid_handle');

  ensureIdentity(handle, 'agent');

  const now = nowIso();
  const existing = getIdentity(handle);
  const bindingToken = existing?.bindingToken || newToken(12);
  db.prepare("UPDATE identities SET origin='openclaw', binding_token=?, bound_at=COALESCE(bound_at, ?) WHERE handle=?").run(
    bindingToken,
    now,
    handle
  );

  if (args.displayName) {
    db.prepare('UPDATE identities SET display_name=? WHERE handle=?').run(args.displayName, handle);
  }

  if (args.runtime) {
    upsertAgentRuntime({ agentHandle: handle, runtime: args.runtime });
  }

  const joinResult = joinProject({ projectSlug: args.projectSlug, actorHandle: handle, actorType: 'agent' });
  return { identity: getIdentity(handle), joinResult, bindingToken };
}

function ensureDogfoodA2aSiteProject() {
  const db = getDb();
  const slug = 'a2a-site';

  let existing = getProjectBySlug(slug);
  if (!existing) {
    createProject({
      name: 'a2a-site',
      slug,
      summary: 'The product building itself: tasks, proposals, decisions, and history.',
      visibility: 'open',
      actorHandle: 'local-human',
      actorType: 'human',
    });
    existing = getProjectBySlug(slug);
  }

  if (!existing) return;
  const pid = existing.id;

  // Ensure DECISIONS.md isn’t empty.
  const now = nowIso();
  const dec = db
    .prepare('SELECT content FROM project_files WHERE project_id=? AND path=?')
    .get(pid, 'DECISIONS.md') as { content: string } | undefined;
  if (dec && dec.content.includes('(empty)')) {
    db.prepare(
      'UPDATE project_files SET content=?, updated_at=?, last_actor_handle=?, last_actor_type=?, last_proposal_id=? WHERE project_id=? AND path=?'
    ).run(
      '# Decisions\n\n- Keep the collaboration loop simple and explicit.\n- Prefer readability and traceability over cleverness.\n',
      now,
      'local-human',
      'human',
      null,
      pid,
      'DECISIONS.md'
    );
  }

  const taskCount = (db.prepare('SELECT COUNT(*) as c FROM tasks WHERE project_id=?').get(pid) as { c: number }).c;
  if (taskCount > 0) return;

  // Seed a minimal real backlog for dogfooding.
  createTask({
    projectSlug: slug,
    title: 'Tighten homepage entry experience',
    description: 'Keep homepage minimal: logo + search + primary actions + open a2a-site.',
    filePath: 'README.md',
    actorHandle: 'local-human',
    actorType: 'human',
  });
  createTask({
    projectSlug: slug,
    title: 'Improve workspace readability on mobile',
    description: 'Ensure cards stack cleanly and tap targets are comfortable.',
    filePath: 'README.md',
    actorHandle: 'local-human',
    actorType: 'human',
  });
}

function ensureShowcaseDemoProject() {
  const db = getDb();
  const slug = 'showcase-demo';

  let existing = getProjectBySlug(slug);
  if (!existing) {
    // Seed a stable demo project with a believable collaboration trail.
    createProject({
      name: 'Showcase Demo Project',
      slug,
      summary: 'A stable, public demo workspace showing tasks → proposals → merges.',
      visibility: 'open',
      actorHandle: 'local-human',
      actorType: 'human',
    });
    existing = getProjectBySlug(slug);
  }

  if (!existing) return;
  const pid = existing.id;

  // Ensure DECISIONS.md has demo content.
  const now = nowIso();
  const dec = db
    .prepare('SELECT content FROM project_files WHERE project_id=? AND path=?')
    .get(pid, 'DECISIONS.md') as { content: string } | undefined;
  if (dec && dec.content.includes('(empty)')) {
    db.prepare(
      'UPDATE project_files SET content=?, updated_at=?, last_actor_handle=?, last_actor_type=?, last_proposal_id=? WHERE project_id=? AND path=?'
    ).run(
      '# Decisions\n\n- 2026-03-23: Keep this prototype safe: no auth, no automation, no remote execution.\n- 2026-03-23: Tasks → proposals → merge → history is the core loop.\n',
      now,
      'local-human',
      'human',
      null,
      pid,
      'DECISIONS.md'
    );
  }

  // Members: owner already added by createProject.
  // Add an agent member for demo flavor.
  ensureIdentity('demo_ext_agent_showcase', 'agent');
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, member_handle, member_type, role, joined_at) VALUES (?, ?, ?, ?, ?)').run(
    pid,
    'demo_ext_agent_showcase',
    'agent',
    'contributor',
    nowIso()
  );

  const taskCount = (db.prepare('SELECT COUNT(*) as c FROM tasks WHERE project_id=?').get(pid) as { c: number }).c;
  if (taskCount > 0) return;

  // Tasks: one open, one in progress, one completed via merge.
  createTask({
    projectSlug: slug,
    title: 'Review README messaging',
    description: 'Make the one-sentence definition tighter and more public-facing.',
    filePath: 'README.md',
    actorHandle: 'local-human',
    actorType: 'human',
  });

  const t2 = createTask({
    projectSlug: slug,
    title: 'Improve quickstart steps',
    description: 'Ensure the quickstart describes install + verify in a clear order.',
    filePath: 'docs/quickstart.md',
    actorHandle: 'demo_ext_agent_showcase',
    actorType: 'agent',
  });
  taskAction({ taskId: t2.id, action: 'claim', actorHandle: 'demo_ext_agent_showcase', actorType: 'agent' });
  taskAction({ taskId: t2.id, action: 'start', actorHandle: 'demo_ext_agent_showcase', actorType: 'agent' });

  // Proposal linked to task t2, then merged to complete it.
  const pr = createProposal({
    projectSlug: slug,
    title: 'Clarify quickstart verification',
    summary: 'Add explicit “verify signature + sidecar + text_complete” steps.',
    authorHandle: 'demo_ext_agent_showcase',
    authorType: 'agent',
    filePath: 'docs/quickstart.md',
    newContent:
      '## Quickstart (demo)\n\n1) Open /skill.md\n2) Install the node runner\n3) Run verify (signature + sidecar)\n4) Confirm text_complete works\n',
    taskId: t2.id,
  });
  proposalAction({ id: pr!.id, action: 'approve', actorHandle: 'local-human', actorType: 'human' });
  proposalAction({ id: pr!.id, action: 'merge', actorHandle: 'local-human', actorType: 'human' });

  // Leave one open task visible.
}
