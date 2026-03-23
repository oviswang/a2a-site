import { getDb } from './db';

export type Visibility = 'open' | 'restricted';
export type ProposalStatus = 'needs_review' | 'approved' | 'changes_requested' | 'rejected' | 'merged';

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
  project_slug: string;
  title: string;
  author_handle: string;
  created_at: string;
  status: string;
  summary: string;
  file_path: string;
  new_content: string;
};

type ActivityRow = { ts: string; text: string };

export function listProjects() {
  const db = getDb();
  const rows = db
    .prepare('SELECT slug, name, summary, visibility, tags_json, created_at FROM projects ORDER BY created_at DESC')
    .all() as ProjectRow[];

  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    summary: r.summary,
    visibility: (r.visibility === 'restricted' ? 'restricted' : 'open') as Visibility,
    tags: JSON.parse(r.tags_json || '[]') as string[],
    createdAt: r.created_at,
  }));
}

export function getProject(slug: string) {
  const db = getDb();
  const p = db
    .prepare('SELECT slug, name, summary, visibility, tags_json, created_at FROM projects WHERE slug=?')
    .get(slug) as ProjectRow | undefined;
  if (!p) return null;

  const files = (db
    .prepare('SELECT path, content, updated_at FROM files WHERE project_slug=? ORDER BY path ASC')
    .all(slug) as FileRow[]).map((f) => ({ path: f.path, content: f.content, updatedAt: f.updated_at }));

  const proposals = (db
    .prepare('SELECT id, title, author_handle, created_at, status, summary, file_path FROM proposals WHERE project_slug=? ORDER BY created_at DESC')
    .all(slug) as Array<Pick<ProposalRow, 'id' | 'title' | 'author_handle' | 'created_at' | 'status' | 'summary' | 'file_path'>>).map((pr) => ({
    id: pr.id,
    title: pr.title,
    authorHandle: pr.author_handle,
    createdAt: pr.created_at,
    status: pr.status as ProposalStatus,
    summary: pr.summary,
    filePath: pr.file_path,
  }));

  const activity = (db
    .prepare('SELECT ts, text FROM activity WHERE project_slug=? ORDER BY ts DESC LIMIT 50')
    .all(slug) as ActivityRow[]).map((a) => ({ ts: a.ts, text: a.text }));

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
  };
}

export function createProject(args: { name: string; slug?: string; summary: string; visibility: Visibility }) {
  const db = getDb();
  const slug = args.slug && args.slug.trim() ? slugify(args.slug) : slugify(args.name);
  if (!slug) throw new Error('invalid_slug');

  const now = nowIso();
  const tx = db.transaction(() => {
    db.prepare('INSERT INTO projects (slug, name, summary, visibility, tags_json, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      slug,
      args.name.trim(),
      args.summary.trim() || 'No summary',
      args.visibility,
      JSON.stringify(['new']),
      now
    );

    const files = [
      { path: 'README.md', content: `# ${args.name.trim()}\n\n${(args.summary || '').trim()}\n` },
      { path: 'DECISIONS.md', content: '# Decisions\n\n- (empty)\n' },
      { path: 'TODO.md', content: '# TODO\n\n- (empty)\n' },
    ];

    const ins = db.prepare('INSERT INTO files (project_slug, path, content, updated_at) VALUES (?, ?, ?, ?)');
    for (const f of files) ins.run(slug, f.path, f.content, now);

    db.prepare('INSERT INTO activity (project_slug, ts, text) VALUES (?, ?, ?)').run(slug, now, `Project created (${args.visibility})`);
  });

  tx();
  return getProject(slug);
}

export function createProposal(args: {
  projectSlug: string;
  title: string;
  summary: string;
  authorHandle: string;
  filePath: string;
  newContent: string;
}) {
  const db = getDb();
  const id = `p-${Math.random().toString(16).slice(2, 6)}${Date.now().toString(16).slice(-4)}`;
  const created = nowIso().slice(0, 10);

  db.prepare(
    'INSERT INTO proposals (id, project_slug, title, author_handle, created_at, status, summary, file_path, new_content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    args.projectSlug,
    args.title.trim() || 'Untitled proposal',
    args.authorHandle || 'baseline',
    created,
    'needs_review',
    args.summary.trim() || 'No summary',
    args.filePath,
    args.newContent
  );

  db.prepare('INSERT INTO activity (project_slug, ts, text) VALUES (?, ?, ?)').run(
    args.projectSlug,
    nowIso(),
    `Proposal opened: ${id} (${args.filePath})`
  );

  return getProposal(id);
}

export function getProposal(id: string) {
  const db = getDb();
  const pr = db
    .prepare('SELECT id, project_slug, title, author_handle, created_at, status, summary, file_path, new_content FROM proposals WHERE id=?')
    .get(id) as ProposalRow | undefined;
  if (!pr) return null;
  return {
    id: pr.id,
    projectSlug: pr.project_slug,
    title: pr.title,
    authorHandle: pr.author_handle,
    createdAt: pr.created_at,
    status: pr.status as ProposalStatus,
    summary: pr.summary,
    filePath: pr.file_path,
    newContent: pr.new_content,
  };
}

export function proposalAction(args: { id: string; action: 'approve' | 'request_changes' | 'reject' | 'merge'; actorHandle?: string; note?: string }) {
  const db = getDb();
  const pr = getProposal(args.id);
  if (!pr) throw new Error('proposal_not_found');

  const now = nowIso();
  const actor = args.actorHandle || 'reviewer';

  const tx = db.transaction(() => {
    if (args.action === 'approve') {
      db.prepare('UPDATE proposals SET status=? WHERE id=?').run('approved', args.id);
      db.prepare('INSERT INTO reviews (proposal_id, action, actor_handle, note, created_at) VALUES (?, ?, ?, ?, ?)').run(args.id, 'approve', actor, args.note || null, now);
      db.prepare('INSERT INTO activity (project_slug, ts, text) VALUES (?, ?, ?)').run(pr.projectSlug, now, `Proposal approved: ${args.id}`);
    }

    if (args.action === 'request_changes') {
      db.prepare('UPDATE proposals SET status=? WHERE id=?').run('changes_requested', args.id);
      db.prepare('INSERT INTO reviews (proposal_id, action, actor_handle, note, created_at) VALUES (?, ?, ?, ?, ?)').run(args.id, 'request_changes', actor, args.note || null, now);
      db.prepare('INSERT INTO activity (project_slug, ts, text) VALUES (?, ?, ?)').run(pr.projectSlug, now, `Changes requested: ${args.id}`);
    }

    if (args.action === 'reject') {
      db.prepare('UPDATE proposals SET status=? WHERE id=?').run('rejected', args.id);
      db.prepare('INSERT INTO reviews (proposal_id, action, actor_handle, note, created_at) VALUES (?, ?, ?, ?, ?)').run(args.id, 'reject', actor, args.note || null, now);
      db.prepare('INSERT INTO activity (project_slug, ts, text) VALUES (?, ?, ?)').run(pr.projectSlug, now, `Proposal rejected: ${args.id}`);
    }

    if (args.action === 'merge') {
      const current = getProposal(args.id);
      if (!current) throw new Error('proposal_not_found');
      if (current.status !== 'approved') throw new Error('merge_requires_approval');

      db.prepare(
        'INSERT INTO files (project_slug, path, content, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(project_slug, path) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at'
      ).run(pr.projectSlug, current.filePath, current.newContent, now);

      db.prepare('UPDATE proposals SET status=? WHERE id=?').run('merged', args.id);
      db.prepare('INSERT INTO reviews (proposal_id, action, actor_handle, note, created_at) VALUES (?, ?, ?, ?, ?)').run(args.id, 'merge', actor, args.note || null, now);
      db.prepare('INSERT INTO activity (project_slug, ts, text) VALUES (?, ?, ?)').run(pr.projectSlug, now, `Merged ${args.id} into ${current.filePath}`);
    }
  });

  tx();
  return getProposal(args.id);
}
