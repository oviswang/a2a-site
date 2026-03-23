import { getDb } from './db';

export type Visibility = 'open' | 'restricted';
export type ProposalStatus = 'needs_review' | 'approved' | 'changes_requested' | 'rejected' | 'merged';

export type MemberType = 'human' | 'agent';
export type MemberRole = 'owner' | 'maintainer' | 'contributor';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export type IdentityType = MemberType;
export type ClaimState = 'unclaimed' | 'claimed';

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

  ensureIdentity(args.authorHandle || 'baseline', args.authorType);

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
  ensureIdentity(actorHandle, actorType);

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

export type Identity = {
  handle: string;
  identityType: IdentityType;
  displayName: string | null;
  ownerHandle: string | null;
  claimState: ClaimState;
  createdAt: string;
};

function ensureIdentity(handle: string, identityType: IdentityType) {
  const db = getDb();
  const now = nowIso();
  db.prepare(
    'INSERT INTO identities (handle, identity_type, display_name, owner_handle, claim_state, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(handle) DO NOTHING'
  ).run(handle, identityType, null, null, identityType === 'agent' ? 'unclaimed' : 'claimed', now);
}

export function listIdentities(): Identity[] {
  const db = getDb();

  // Ensure defaults exist.
  ensureIdentity('local-human', 'human');
  ensureIdentity('local-agent', 'agent');

  const rows = db
    .prepare('SELECT handle, identity_type, display_name, owner_handle, claim_state, created_at FROM identities ORDER BY created_at DESC')
    .all() as Array<{
    handle: string;
    identity_type: string;
    display_name: string | null;
    owner_handle: string | null;
    claim_state: string;
    created_at: string;
  }>;

  return rows.map((r) => ({
    handle: r.handle,
    identityType: r.identity_type === 'agent' ? 'agent' : 'human',
    displayName: r.display_name ?? null,
    ownerHandle: r.owner_handle ?? null,
    claimState: r.claim_state === 'claimed' ? 'claimed' : 'unclaimed',
    createdAt: r.created_at,
  }));
}

export function getIdentity(handle: string): Identity | null {
  const db = getDb();
  const r = db
    .prepare('SELECT handle, identity_type, display_name, owner_handle, claim_state, created_at FROM identities WHERE handle=?')
    .get(handle) as
    | {
        handle: string;
        identity_type: string;
        display_name: string | null;
        owner_handle: string | null;
        claim_state: string;
        created_at: string;
      }
    | undefined;
  if (!r) return null;
  return {
    handle: r.handle,
    identityType: r.identity_type === 'agent' ? 'agent' : 'human',
    displayName: r.display_name ?? null,
    ownerHandle: r.owner_handle ?? null,
    claimState: r.claim_state === 'claimed' ? 'claimed' : 'unclaimed',
    createdAt: r.created_at,
  };
}

export function createAgentIdentity(args: { handle: string; displayName?: string | null }) {
  const db = getDb();
  const now = nowIso();
  const handle = slugify(args.handle).replace(/-/g, '_');
  if (!handle) throw new Error('invalid_handle');

  db.prepare('INSERT INTO identities (handle, identity_type, display_name, owner_handle, claim_state, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    handle,
    'agent',
    args.displayName || null,
    null,
    'unclaimed',
    now
  );

  return getIdentity(handle);
}

export function claimAgentIdentity(args: { handle: string; ownerHandle: string }) {
  const db = getDb();
  const id = getIdentity(args.handle);
  if (!id) throw new Error('identity_not_found');
  if (id.identityType !== 'agent') throw new Error('not_an_agent');

  ensureIdentity(args.ownerHandle, 'human');

  db.prepare('UPDATE identities SET claim_state=?, owner_handle=? WHERE handle=?').run('claimed', args.ownerHandle, args.handle);

  return getIdentity(args.handle);
}
