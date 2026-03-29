import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

function dbPath() {
  // Keep DB inside the app directory so preview service can read/write.
  // Override via env if needed.
  return process.env.A2A_SITE_DB_PATH || path.join(process.cwd(), '.data', 'a2a-site.db');
}

let _db: Database.Database | null = null;

export function getDb() {
  if (_db) return _db;

  const p = dbPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });

  const db = new Database(p);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  visibility TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, path),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  author_handle TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  file_path TEXT NOT NULL,
  new_content TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  ts TEXT NOT NULL,
  text TEXT NOT NULL,
  kind TEXT,
  entity_type TEXT,
  entity_id TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_project_ts ON activity(project_id, ts);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity(entity_type, entity_id, ts);

CREATE TABLE IF NOT EXISTS project_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  member_handle TEXT NOT NULL,
  member_type TEXT NOT NULL,
  role TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  UNIQUE(project_id, member_handle),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS join_requests (
  id TEXT PRIMARY KEY,
  project_id INTEGER NOT NULL,
  member_handle TEXT NOT NULL,
  member_type TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  status TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT,
  pre_summary TEXT,
  UNIQUE(project_id, member_handle),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  project_id INTEGER NOT NULL,
  invitee_handle TEXT NOT NULL,
  invitee_type TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by_handle TEXT NOT NULL,
  created_by_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  accepted_at TEXT,
  UNIQUE(project_id, invitee_handle, invitee_type),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_handle TEXT NOT NULL,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  link TEXT,
  created_at TEXT NOT NULL,
  read_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_events_kind_ts ON audit_events(kind, ts);

-- Discussion layer (v1)
CREATE TABLE IF NOT EXISTS discussion_threads (
  id TEXT PRIMARY KEY,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  author_handle TEXT NOT NULL,
  author_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_project_created_at ON discussion_threads(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_entity ON discussion_threads(entity_type, entity_id, created_at);

CREATE TABLE IF NOT EXISTS discussion_replies (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  body_md TEXT NOT NULL,
  author_handle TEXT NOT NULL,
  author_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(thread_id) REFERENCES discussion_threads(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_thread_created_at ON discussion_replies(thread_id, created_at);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT,
  default_actor_handle TEXT,
  default_actor_type TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS identities (
  handle TEXT PRIMARY KEY,
  identity_type TEXT NOT NULL,
  display_name TEXT,
  owner_handle TEXT,
  owner_user_id INTEGER,
  user_id INTEGER,
  claim_state TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'local',
  claim_token TEXT,
  binding_token TEXT,
  bound_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_runtime (
  agent_handle TEXT PRIMARY KEY,
  runtime_json TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  FOREIGN KEY(agent_handle) REFERENCES identities(handle) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id INTEGER NOT NULL,
  parent_task_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  claimed_by_handle TEXT,
  claimed_by_type TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  file_path TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  actor_handle TEXT,
  actor_type TEXT,
  kind TEXT NOT NULL,
  note TEXT,
  proposal_id TEXT,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_deliverables (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE,
  project_slug TEXT NOT NULL,
  author_handle TEXT NOT NULL,
  author_type TEXT NOT NULL,
  summary_md TEXT NOT NULL,
  evidence_links_json TEXT NOT NULL,
  status TEXT NOT NULL,
  revision_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  submitted_at TEXT,
  reviewed_at TEXT,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_deliverables_project_slug_status_reviewed_at ON task_deliverables(project_slug, status, reviewed_at);

CREATE TABLE IF NOT EXISTS deliverable_attachments (
  id TEXT PRIMARY KEY,
  deliverable_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  project_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  uploaded_by_handle TEXT NOT NULL,
  uploaded_by_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(deliverable_id) REFERENCES task_deliverables(id) ON DELETE CASCADE,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deliverable_attachments_deliverable_id ON deliverable_attachments(deliverable_id, created_at);
`);

  // Lightweight migrations for additive columns.
  const tableInfo = (table: string) => db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  const hasCol = (table: string, col: string) => tableInfo(table).some((r) => r.name === col);

  if (hasCol('users', 'id') && !hasCol('users', 'default_actor_handle')) {
    db.exec(`ALTER TABLE users ADD COLUMN default_actor_handle TEXT`);
  }
  if (hasCol('users', 'id') && !hasCol('users', 'default_actor_type')) {
    db.exec(`ALTER TABLE users ADD COLUMN default_actor_type TEXT`);
  }

  if (hasCol('users', 'id') && !hasCol('users', 'x_user_id')) {
    db.exec(`ALTER TABLE users ADD COLUMN x_user_id TEXT`);
    // Unique index (additive) — safe for new installs; existing DB should have NULLs.
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_x_user_id ON users(x_user_id)`);
  }
  if (hasCol('users', 'id') && !hasCol('users', 'avatar_url')) {
    db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
  }
  if (hasCol('users', 'id') && !hasCol('users', 'last_login_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN last_login_at TEXT`);
  }

  if (hasCol('identities', 'handle') && !hasCol('identities', 'owner_user_id')) {
    db.exec(`ALTER TABLE identities ADD COLUMN owner_user_id INTEGER`);
  }
  if (hasCol('identities', 'handle') && !hasCol('identities', 'user_id')) {
    db.exec(`ALTER TABLE identities ADD COLUMN user_id INTEGER`);
  }
  if (hasCol('identities', 'handle') && !hasCol('identities', 'origin')) {
    db.exec(`ALTER TABLE identities ADD COLUMN origin TEXT NOT NULL DEFAULT 'local'`);
  }
  if (hasCol('identities', 'handle') && !hasCol('identities', 'claim_token')) {
    db.exec(`ALTER TABLE identities ADD COLUMN claim_token TEXT`);
  }

  // Activity table additive columns for structured timeline.
  if (hasCol('activity', 'id') && !hasCol('activity', 'kind')) {
    db.exec(`ALTER TABLE activity ADD COLUMN kind TEXT`);
  }
  if (hasCol('activity', 'id') && !hasCol('activity', 'entity_type')) {
    db.exec(`ALTER TABLE activity ADD COLUMN entity_type TEXT`);
  }
  if (hasCol('activity', 'id') && !hasCol('activity', 'entity_id')) {
    db.exec(`ALTER TABLE activity ADD COLUMN entity_id TEXT`);
  }
  if (hasCol('identities', 'handle') && !hasCol('identities', 'binding_token')) {
    db.exec(`ALTER TABLE identities ADD COLUMN binding_token TEXT`);
  }
  if (hasCol('identities', 'handle') && !hasCol('identities', 'bound_at')) {
    db.exec(`ALTER TABLE identities ADD COLUMN bound_at TEXT`);
  }
  if (hasCol('identities', 'handle') && !hasCol('identities', 'claim_token_hash')) {
    db.exec(`ALTER TABLE identities ADD COLUMN claim_token_hash TEXT`);
  }
  if (hasCol('identities', 'handle') && !hasCol('identities', 'binding_token_hash')) {
    db.exec(`ALTER TABLE identities ADD COLUMN binding_token_hash TEXT`);
  }

  if (hasCol('proposals', 'id') && !hasCol('proposals', 'author_type')) {
    db.exec(`ALTER TABLE proposals ADD COLUMN author_type TEXT NOT NULL DEFAULT 'human'`);
  }
  if (hasCol('proposals', 'id') && !hasCol('proposals', 'task_id')) {
    db.exec(`ALTER TABLE proposals ADD COLUMN task_id TEXT`);
  }
  if (hasCol('proposals', 'id') && !hasCol('proposals', 'updated_at')) {
    db.exec(`ALTER TABLE proposals ADD COLUMN updated_at TEXT`);
  }

  if (hasCol('tasks', 'id') && !hasCol('tasks', 'parent_task_id')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN parent_task_id TEXT`);
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id)`);

  // Blocker signal (coordination-only; do not overload status machine)
  if (hasCol('tasks', 'id') && !hasCol('tasks', 'is_blocked')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN is_blocked INTEGER NOT NULL DEFAULT 0`);
  }
  if (hasCol('tasks', 'id') && !hasCol('tasks', 'blocked_reason')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN blocked_reason TEXT`);
  }
  if (hasCol('tasks', 'id') && !hasCol('tasks', 'blocked_by_task_id')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN blocked_by_task_id TEXT`);
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_is_blocked ON tasks(is_blocked)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_blocked_by_task_id ON tasks(blocked_by_task_id)`);

  if (hasCol('reviews', 'id') && !hasCol('reviews', 'actor_handle')) {
    db.exec(`ALTER TABLE reviews ADD COLUMN actor_handle TEXT`);
  }
  if (hasCol('reviews', 'id') && !hasCol('reviews', 'actor_type')) {
    db.exec(`ALTER TABLE reviews ADD COLUMN actor_type TEXT`);
  }
  if (hasCol('reviews', 'id') && !hasCol('reviews', 'note')) {
    db.exec(`ALTER TABLE reviews ADD COLUMN note TEXT`);
  }

  if (hasCol('project_files', 'id') && !hasCol('project_files', 'last_actor_handle')) {
    db.exec(`ALTER TABLE project_files ADD COLUMN last_actor_handle TEXT`);
  }
  if (hasCol('project_files', 'id') && !hasCol('project_files', 'last_actor_type')) {
    db.exec(`ALTER TABLE project_files ADD COLUMN last_actor_type TEXT`);
  }
  if (hasCol('project_files', 'id') && !hasCol('project_files', 'last_proposal_id')) {
    db.exec(`ALTER TABLE project_files ADD COLUMN last_proposal_id TEXT`);
  }

  if (hasCol('join_requests', 'id') && !hasCol('join_requests', 'pre_summary')) {
    db.exec(`ALTER TABLE join_requests ADD COLUMN pre_summary TEXT`);
  }

  // Ensure task_deliverables + deliverable_attachments exist for older DBs created before these tables were added.
  db.exec(`
CREATE TABLE IF NOT EXISTS task_deliverables (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE,
  project_slug TEXT NOT NULL,
  author_handle TEXT NOT NULL,
  author_type TEXT NOT NULL,
  summary_md TEXT NOT NULL,
  evidence_links_json TEXT NOT NULL,
  status TEXT NOT NULL,
  revision_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  submitted_at TEXT,
  reviewed_at TEXT,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_deliverables_project_slug_status_reviewed_at ON task_deliverables(project_slug, status, reviewed_at);

CREATE TABLE IF NOT EXISTS deliverable_attachments (
  id TEXT PRIMARY KEY,
  deliverable_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  project_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  uploaded_by_handle TEXT NOT NULL,
  uploaded_by_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(deliverable_id) REFERENCES task_deliverables(id) ON DELETE CASCADE,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_deliverable_attachments_deliverable_id ON deliverable_attachments(deliverable_id, created_at);
`);

  _db = db;
  return db;
}
