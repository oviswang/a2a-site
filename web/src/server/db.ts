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
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

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
  if (hasCol('identities', 'handle') && !hasCol('identities', 'binding_token')) {
    db.exec(`ALTER TABLE identities ADD COLUMN binding_token TEXT`);
  }
  if (hasCol('identities', 'handle') && !hasCol('identities', 'bound_at')) {
    db.exec(`ALTER TABLE identities ADD COLUMN bound_at TEXT`);
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

  _db = db;
  return db;
}
