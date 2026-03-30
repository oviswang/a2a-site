import { getDb } from './db';
import crypto from 'node:crypto';
import { computeJoinRequestPreSummary } from './joinRequestSummary';
import { listRecentAcceptedDeliverables } from './deliverables';
import { listAttachmentsForDeliverable } from './attachments';
import { getTaskChildrenWithRollup } from './taskTree';

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
  xUserId?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  defaultActorHandle?: string | null;
  defaultActorType?: MemberType | null;
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

export function upsertUserFromX(args: {
  xUserId: string;
  handle: string; // x username
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const db = getDb();
  const now = nowIso();
  const xUserId = String(args.xUserId);
  const handle = normalizeUserHandle(args.handle);
  if (!xUserId) throw new Error('invalid_x_user_id');
  if (!handle) throw new Error('invalid_handle');

  // Find by x_user_id first.
  const existing = db
    .prepare('SELECT id, handle FROM users WHERE x_user_id=?')
    .get(xUserId) as { id: number; handle: string } | undefined;

  if (existing) {
    db.prepare('UPDATE users SET display_name=?, avatar_url=?, last_login_at=? WHERE id=?').run(args.displayName || null, args.avatarUrl || null, now, existing.id);
    ensureIdentity(existing.handle, 'human');
    db.prepare('UPDATE identities SET user_id=? WHERE handle=?').run(existing.id, existing.handle);
    return getUserByHandle(existing.handle);
  }

  // Create new user (handle from X username).
  db.prepare(
    'INSERT INTO users (handle, display_name, x_user_id, avatar_url, last_login_at, default_actor_handle, default_actor_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(handle, args.displayName || null, xUserId, args.avatarUrl || null, now, null, null, now);

  const u = getUserByHandle(handle);
  ensureIdentity(handle, 'human');
  if (u) db.prepare('UPDATE identities SET user_id=? WHERE handle=?').run(u.id, handle);
  return u;
}

export function listUsers(): User[] {
  const db = getDb();

  // Ensure at least one default user exists for the minimal identity layer.
  // NOTE: local-human is a fallback/dev identity and should not be exposed to signed-in users.
  if (!getUserByHandle('local-human')) {
    const now = nowIso();
    db.prepare('INSERT INTO users (handle, display_name, default_actor_handle, default_actor_type, created_at) VALUES (?, ?, ?, ?, ?)').run(
      'local-human',
      'Local Human',
      null,
      null,
      now
    );
    ensureIdentity('local-human', 'human');
    const u = getUserByHandle('local-human');
    if (u) db.prepare('UPDATE identities SET user_id=? WHERE handle=?').run(u.id, 'local-human');
  }

  const rows = db
    .prepare(
      'SELECT id, handle, display_name, x_user_id, avatar_url, last_login_at, default_actor_handle, default_actor_type, created_at FROM users ORDER BY created_at DESC'
    )
    .all() as Array<{
    id: number;
    handle: string;
    display_name: string | null;
    x_user_id: string | null;
    avatar_url: string | null;
    last_login_at: string | null;
    default_actor_handle: string | null;
    default_actor_type: string | null;
    created_at: string;
  }>;

  // Hide internal/demo/dev identities from the People directory.
  // This prevents real signed-in users from seeing or switching into seed/local/demo accounts.
  const hiddenPrefixes = ['local_', 'seed_', 'pilot_'];
  const filtered = rows.filter((r) => {
    const h = String(r.handle || '');
    if (h === 'local-human') return false;
    return !hiddenPrefixes.some((p) => h.startsWith(p));
  });

  return filtered.map((r) => ({
    id: r.id,
    handle: r.handle,
    displayName: r.display_name ?? null,
    xUserId: r.x_user_id ?? null,
    avatarUrl: r.avatar_url ?? null,
    lastLoginAt: r.last_login_at ?? null,
    defaultActorHandle: r.default_actor_handle ?? null,
    defaultActorType: r.default_actor_type === 'agent' ? 'agent' : r.default_actor_type === 'human' ? 'human' : null,
    createdAt: r.created_at,
  }));
}

export function getUserByHandle(handle: string): User | null {
  const db = getDb();
  const r = db
    .prepare('SELECT id, handle, display_name, x_user_id, avatar_url, last_login_at, default_actor_handle, default_actor_type, created_at FROM users WHERE handle=?')
    .get(handle) as
    | {
        id: number;
        handle: string;
        display_name: string | null;
        x_user_id: string | null;
        avatar_url: string | null;
        last_login_at: string | null;
        default_actor_handle: string | null;
        default_actor_type: string | null;
        created_at: string;
      }
    | undefined;
  if (!r) return null;
  return {
    id: r.id,
    handle: r.handle,
    displayName: r.display_name ?? null,
    xUserId: r.x_user_id ?? null,
    avatarUrl: r.avatar_url ?? null,
    lastLoginAt: r.last_login_at ?? null,
    defaultActorHandle: r.default_actor_handle ?? null,
    defaultActorType: r.default_actor_type === 'agent' ? 'agent' : r.default_actor_type === 'human' ? 'human' : null,
    createdAt: r.created_at,
  };
}

export function createUser(args: { handle: string; displayName?: string | null }): User {
  const db = getDb();
  const now = nowIso();
  const handle = normalizeUserHandle(args.handle);
  if (!handle) throw new Error('invalid_handle');

  db.prepare(
    'INSERT INTO users (handle, display_name, x_user_id, avatar_url, last_login_at, default_actor_handle, default_actor_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(handle, args.displayName || null, null, null, null, null, null, now);

  // Ensure the corresponding human identity exists and is linked.
  ensureIdentity(handle, 'human');
  const u = getUserByHandle(handle);
  if (u) db.prepare('UPDATE identities SET user_id=? WHERE handle=?').run(u.id, handle);

  return u || { id: -1, handle, displayName: args.displayName || null, createdAt: now };
}

export function updateUserPreferences(args: {
  handle: string;
  defaultActorHandle: string | null;
  defaultActorType: MemberType | null;
}) {
  const db = getDb();
  const handle = normalizeUserHandle(args.handle);
  const t = args.defaultActorType === 'agent' ? 'agent' : args.defaultActorType === 'human' ? 'human' : null;
  const h = args.defaultActorHandle ? String(args.defaultActorHandle) : null;
  db.prepare('UPDATE users SET default_actor_handle=?, default_actor_type=? WHERE handle=?').run(h, t, handle);
  return getUserByHandle(handle);
}

export function getUserProfile(handleRaw: string) {
  const db = getDb();
  const handle = normalizeUserHandle(handleRaw);
  const user = getUserByHandle(handle);
  if (!user) return null;

  const joinedProjects = db
    .prepare(
      `SELECT p.slug as slug, p.name as name, pm.role as role, pm.joined_at as joined_at
       FROM project_members pm JOIN projects p ON p.id=pm.project_id
       WHERE pm.member_handle=? AND pm.member_type='human'
       ORDER BY pm.joined_at DESC`
    )
    .all(handle) as Array<{ slug: string; name: string; role: string; joined_at: string }>;

  const ownedAgents = db
    .prepare(
      `SELECT handle, display_name, claim_state, origin, bound_at
       FROM identities
       WHERE identity_type='agent' AND owner_handle=?
       ORDER BY created_at DESC`
    )
    .all(handle) as Array<{ handle: string; display_name: string | null; claim_state: string; origin: string | null; bound_at: string | null }>;

  return {
    user,
    joinedProjects: joinedProjects.map((p) => ({
      slug: p.slug,
      name: p.name,
      role: (p.role === 'owner' ? 'owner' : p.role === 'maintainer' ? 'maintainer' : 'contributor') as MemberRole,
      joinedAt: p.joined_at,
    })),
    ownedAgents: ownedAgents.map((a) => ({
      handle: a.handle,
      displayName: a.display_name ?? null,
      claimState: a.claim_state === 'claimed' ? 'claimed' : 'unclaimed',
      origin: a.origin || 'local',
      boundAt: a.bound_at,
    })),
  };
}

export type Notification = {
  id: string;
  kind: string;
  text: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
};

function notifyHuman(handle: string, kind: string, text: string, link?: string | null) {
  const db = getDb();
  const now = nowIso();
  const h = normalizeUserHandle(handle);
  if (!h) return;

  // Ensure a minimal user record exists.
  if (!getUserByHandle(h)) {
    try {
      createUser({ handle: h });
    } catch {
      // ignore
    }
  }
  ensureIdentity(h, 'human');

  const id = `n-${Math.random().toString(16).slice(2, 6)}${Date.now().toString(16).slice(-4)}`;
  db.prepare('INSERT INTO notifications (id, user_handle, kind, text, link, created_at, read_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id,
    h,
    kind,
    text,
    link || null,
    now,
    null
  );
}

export function listNotifications(args: { userHandle: string; limit?: number }) {
  const db = getDb();
  const h = normalizeUserHandle(args.userHandle);
  const limit = Math.max(1, Math.min(200, args.limit || 50));
  const rows = db
    .prepare('SELECT id, kind, text, link, created_at, read_at FROM notifications WHERE user_handle=? ORDER BY created_at DESC LIMIT ?')
    .all(h, limit) as Array<{ id: string; kind: string; text: string; link: string | null; created_at: string; read_at: string | null }>;
  return rows.map((r) => ({ id: r.id, kind: r.kind, text: r.text, link: r.link, createdAt: r.created_at, readAt: r.read_at }));
}

export function unreadNotificationCount(userHandle: string) {
  const db = getDb();
  const h = normalizeUserHandle(userHandle);
  const r = db.prepare('SELECT COUNT(1) as c FROM notifications WHERE user_handle=? AND read_at IS NULL').get(h) as { c: number };
  return r?.c || 0;
}

export function markNotificationRead(args: { id: string; userHandle: string }) {
  const db = getDb();
  const h = normalizeUserHandle(args.userHandle);
  const now = nowIso();
  db.prepare('UPDATE notifications SET read_at=? WHERE id=? AND user_handle=?').run(now, args.id, h);
  return { ok: true };
}

export function listJoinRequestsForApprover(args: { approverHandle: string }) {
  const db = getDb();
  const approver = normalizeUserHandle(args.approverHandle);
  if (!approver) throw new Error('invalid_approver');

  // Only show requests for projects where approver is human owner/maintainer.
  const rows = db
    .prepare(
      `SELECT
         jr.id AS id,
         jr.requested_at AS requested_at,
         jr.status AS status,
         jr.member_handle AS member_handle,
         jr.member_type AS member_type,
         p.slug AS project_slug,
         p.name AS project_name,
         p.visibility AS visibility,
         jr.pre_summary AS pre_summary
       FROM join_requests jr
       JOIN projects p ON p.id = jr.project_id
       JOIN project_members pm ON pm.project_id = jr.project_id
       WHERE pm.member_handle=?
         AND pm.member_type='human'
         AND (pm.role='owner' OR pm.role='maintainer')
         AND jr.status='pending'
       ORDER BY jr.requested_at DESC
       LIMIT 100`
    )
    .all(approver) as Array<{
    id: string;
    requested_at: string;
    status: string;
    member_handle: string;
    member_type: string;
    project_slug: string;
    project_name: string;
    visibility: string;
    pre_summary: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    requestedAt: r.requested_at,
    status: r.status,
    requester: { handle: r.member_handle, type: r.member_type === 'agent' ? 'agent' : 'human' },
    project: { slug: r.project_slug, name: r.project_name, visibility: r.visibility === 'restricted' ? 'restricted' : 'open' },
    preSummary: r.pre_summary || null,
  }));
}

export type SearchResults = {
  q: string;
  projects: Array<{ slug: string; name: string; summary: string }>;
  tasks: Array<{ id: string; title: string; status: string; projectSlug: string }>;
  proposals: Array<{ id: string; title: string; status: string; projectSlug: string; filePath: string }>;
  files: Array<{ projectSlug: string; path: string }>;
  agents: Array<{ handle: string; displayName: string | null; origin: string }>; // from identities
  discussions?: Array<{
    threadId: string;
    threadTitle: string;
    projectSlug: string;
    projectName: string;
    entityType: DiscussionEntityType;
    entityId: string | null;
    updatedAt: string;
    link: string;
    matchedIn: 'title' | 'body' | 'reply';
  }>;
};

export function searchAll(qRaw: string, opts?: { includeDiscussions?: boolean; actorHandle?: string | null }): SearchResults {
  const db = getDb();
  const q = (qRaw || '').trim();
  const like = `%${q.replace(/%/g, '')}%`;
  if (!q) return { q: '', projects: [], tasks: [], proposals: [], files: [], agents: [], discussions: [] };

  const projects = db
    .prepare('SELECT slug, name, summary FROM projects WHERE slug LIKE ? OR name LIKE ? OR summary LIKE ? ORDER BY created_at DESC LIMIT 10')
    .all(like, like, like) as Array<{ slug: string; name: string; summary: string }>;

  const tasks = db
    .prepare(
      `SELECT t.id as id, t.title as title, t.status as status, p.slug as project_slug
       FROM tasks t JOIN projects p ON p.id=t.project_id
       WHERE t.id LIKE ? OR t.title LIKE ? OR t.description LIKE ?
       ORDER BY t.updated_at DESC LIMIT 10`
    )
    .all(like, like, like) as Array<{ id: string; title: string; status: string; project_slug: string }>;

  const proposals = db
    .prepare(
      `SELECT pr.id as id, pr.title as title, pr.status as status, pr.file_path as file_path, p.slug as project_slug
       FROM proposals pr JOIN projects p ON p.id=pr.project_id
       WHERE pr.id LIKE ? OR pr.title LIKE ? OR pr.summary LIKE ? OR pr.file_path LIKE ?
       ORDER BY pr.created_at DESC LIMIT 10`
    )
    .all(like, like, like, like) as Array<{ id: string; title: string; status: string; file_path: string; project_slug: string }>;

  const files = db
    .prepare(
      `SELECT pf.path as path, p.slug as project_slug
       FROM project_files pf JOIN projects p ON p.id=pf.project_id
       WHERE pf.path LIKE ? OR pf.content LIKE ?
       ORDER BY pf.updated_at DESC LIMIT 10`
    )
    .all(like, like) as Array<{ path: string; project_slug: string }>;

  const agents = db
    .prepare(
      `SELECT handle, display_name, origin
       FROM identities
       WHERE identity_type='agent' AND (handle LIKE ? OR display_name LIKE ?)
       ORDER BY created_at DESC LIMIT 10`
    )
    .all(like, like) as Array<{ handle: string; display_name: string | null; origin: string | null }>;

  return {
    q,
    projects,
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, projectSlug: t.project_slug })),
    proposals: proposals.map((p) => ({ id: p.id, title: p.title, status: p.status, projectSlug: p.project_slug, filePath: p.file_path })),
    files: files.map((f) => ({ projectSlug: f.project_slug, path: f.path })),
    agents: agents.map((a) => ({ handle: a.handle, displayName: a.display_name ?? null, origin: a.origin || 'local' })),
    discussions:
      opts?.includeDiscussions && opts?.actorHandle
        ? ((): any[] => {
            // permission: include restricted projects only if actor is a member
            const allowedProjectIds = new Set(
              (db
                .prepare("SELECT project_id FROM project_members WHERE member_handle=? AND member_type='human'")
                .all(String(opts.actorHandle)) as any[]).map((r) => Number(r.project_id))
            );

            const rows = db
              .prepare(
                `SELECT t.id as thread_id, t.title as title, t.body_md as body_md, t.entity_type as entity_type, t.entity_id as entity_id,
                        t.updated_at as updated_at,
                        p.id as project_id, p.slug as project_slug, p.name as project_name, p.visibility as visibility
                 FROM discussion_threads t
                 JOIN projects p ON p.id=t.project_id
                 WHERE (t.title LIKE ? OR t.body_md LIKE ? OR EXISTS (
                   SELECT 1 FROM discussion_replies r WHERE r.thread_id=t.id AND r.body_md LIKE ?
                 ))
                 ORDER BY t.updated_at DESC
                 LIMIT 10`
              )
              .all(like, like, like) as any[];

            const out: any[] = [];
            for (const r of rows) {
              const vis = r.visibility === 'restricted' ? 'restricted' : 'open';
              const pid = Number(r.project_id);
              if (vis === 'restricted' && !allowedProjectIds.has(pid)) continue;

              let matchedIn: 'title' | 'body' | 'reply' = 'reply';
              const title = String(r.title || '');
              const body = String(r.body_md || '');
              const needle = q.toLowerCase();
              if (title.toLowerCase().includes(needle)) matchedIn = 'title';
              else if (body.toLowerCase().includes(needle)) matchedIn = 'body';

              out.push({
                threadId: String(r.thread_id),
                threadTitle: String(r.title),
                projectSlug: String(r.project_slug),
                projectName: String(r.project_name),
                entityType: r.entity_type === 'task' ? 'task' : r.entity_type === 'proposal' ? 'proposal' : 'project',
                entityId: r.entity_id ? String(r.entity_id) : null,
                updatedAt: String(r.updated_at),
                link: `/projects/${encodeURIComponent(String(r.project_slug))}/discussions/${encodeURIComponent(String(r.thread_id))}`,
                matchedIn,
              });
            }
            return out;
          })()
        : [],
  };
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

type ActivityRow = { ts: string; text: string; kind?: string | null; entity_type?: string | null; entity_id?: string | null };

export type ActivityEntityType = 'task' | 'proposal' | 'invite' | 'join_request' | 'deliverable' | 'project' | 'member' | 'file' | 'unknown';

export type ActivityEvent = {
  ts: string;
  text: string;
  kind: string;
  entityType: ActivityEntityType;
  entityId: string | null;
};

function addActivity(args: {
  projectId: number;
  ts: string;
  text: string;
  kind?: string;
  entityType?: ActivityEntityType;
  entityId?: string | null;
}) {
  const db = getDb();
  db.prepare('INSERT INTO activity (project_id, ts, text, kind, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?)').run(
    args.projectId,
    args.ts,
    args.text,
    args.kind || null,
    args.entityType || null,
    args.entityId || null
  );
}

function addDiscussionActivity(args: {
  projectId: number;
  ts: string;
  kind:
    | 'discussion.thread_created'
    | 'discussion.thread_closed'
    | 'discussion.thread_locked'
    | 'discussion.thread_unlocked'
    | 'discussion.reply';
  text: string;
  threadId: string;
  threadTitle: string;
  actorHandle: string;
  actorType: MemberType;
  extra?: any;
}) {
  const db = getDb();
  db.prepare(
    'INSERT INTO activity (project_id, ts, text, kind, entity_type, entity_id, thread_id, thread_title, actor_handle, actor_type, extra_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    args.projectId,
    args.ts,
    args.text,
    args.kind,
    'project',
    null,
    args.threadId,
    args.threadTitle,
    args.actorHandle,
    args.actorType,
    args.extra ? JSON.stringify(args.extra) : null
  );
}

// --- Discussion layer (v1) ---

export type DiscussionEntityType = 'project' | 'task' | 'proposal';
export type DiscussionThreadStatus = 'open' | 'closed';

// --- Layer B Phase 1: policy / enforcement ---

type AllowedMentionRole = 'owner' | 'maintainer';

export type ProjectAgentPolicy = {
  projectSlug: string;
  agentHandle: string;
  enabled: boolean;
  allowEntityThreadCreate: boolean;
  allowMentions: boolean;
  mentionDailyLimit: number;
  allowedMentionRoles: AllowedMentionRole[];
  requireReasonForMention: boolean;
  updatedAt: string;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function parseAllowedRoles(input: string): AllowedMentionRole[] {
  const raw = String(input || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const out: AllowedMentionRole[] = [];
  for (const r of raw) {
    if (r === 'owner' || r === 'maintainer') out.push(r);
  }
  return out.length ? out : ['owner', 'maintainer'];
}

function serializeAllowedRoles(roles: AllowedMentionRole[]) {
  const uniq = Array.from(new Set((roles || []).filter((r) => r === 'owner' || r === 'maintainer')));
  return uniq.length ? uniq.join(',') : 'owner,maintainer';
}

function getPolicyRow(db: any, projectId: number, agentHandle: string) {
  agentHandle = normalizeHandle(agentHandle);
  return db
    .prepare(
      `SELECT enabled, allow_entity_thread_create, allow_mentions, mention_daily_limit, allowed_mention_roles, require_reason_for_mention, updated_at
       FROM project_agent_policy
       WHERE project_id=? AND agent_handle=?`
    )
    .get(projectId, agentHandle) as
    | {
        enabled: number;
        allow_entity_thread_create: number;
        allow_mentions: number;
        mention_daily_limit: number;
        allowed_mention_roles: string;
        require_reason_for_mention: number;
        updated_at: string;
      }
    | undefined;
}

export function getProjectAgentPolicy(args: { projectSlug: string; agentHandle: string }): ProjectAgentPolicy | null {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');
  const agentHandle = normalizeHandle(args.agentHandle);
  if (!agentHandle) throw new Error('invalid_agent');

  const r = getPolicyRow(db, p.id, agentHandle);
  if (!r) return null;
  return {
    projectSlug: args.projectSlug,
    agentHandle,
    enabled: Boolean(r.enabled),
    allowEntityThreadCreate: Boolean(r.allow_entity_thread_create),
    allowMentions: Boolean(r.allow_mentions),
    mentionDailyLimit: Number(r.mention_daily_limit || 0),
    allowedMentionRoles: parseAllowedRoles(r.allowed_mention_roles),
    requireReasonForMention: Boolean(r.require_reason_for_mention),
    updatedAt: r.updated_at,
  };
}

export function upsertProjectAgentPolicy(args: {
  projectSlug: string;
  agentHandle: string;
  enabled: boolean;
  allowEntityThreadCreate: boolean;
  allowMentions: boolean;
  mentionDailyLimit: number;
  allowedMentionRoles: AllowedMentionRole[];
  requireReasonForMention: boolean;
  actorHandle: string;
  actorType: MemberType;
}) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');

  if (args.actorType === 'agent') throw new Error('not_supported');
  if (!isProjectOwnerOrMaintainer(p.id, args.actorHandle)) throw new Error('not_allowed');

  const agentHandle = normalizeHandle(args.agentHandle);
  if (!agentHandle) throw new Error('invalid_agent');

  ensureIdentity(agentHandle, 'agent');

  const now = nowIso();
  const enabled = args.enabled ? 1 : 0;
  const allowEntityThreadCreate = args.allowEntityThreadCreate ? 1 : 0;
  const allowMentions = args.allowMentions ? 1 : 0;
  const mentionDailyLimit = Math.max(0, Math.min(50, Number(args.mentionDailyLimit || 0)));
  const allowedRoles = serializeAllowedRoles(args.allowedMentionRoles);
  const requireReason = args.requireReasonForMention ? 1 : 0;

  db.prepare(
    `INSERT INTO project_agent_policy (project_id, agent_handle, enabled, allow_entity_thread_create, allow_mentions, mention_daily_limit, allowed_mention_roles, require_reason_for_mention, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(project_id, agent_handle) DO UPDATE SET
       enabled=excluded.enabled,
       allow_entity_thread_create=excluded.allow_entity_thread_create,
       allow_mentions=excluded.allow_mentions,
       mention_daily_limit=excluded.mention_daily_limit,
       allowed_mention_roles=excluded.allowed_mention_roles,
       require_reason_for_mention=excluded.require_reason_for_mention,
       updated_at=excluded.updated_at`
  ).run(p.id, agentHandle, enabled, allowEntityThreadCreate, allowMentions, mentionDailyLimit, allowedRoles, requireReason, now);

  // audit
  try {
    const payload = {
      kind: 'layerb.policy.upsert',
      ts: now,
      actorHandle: args.actorHandle,
      projectSlug: args.projectSlug,
      agentHandle,
      enabled: Boolean(enabled),
      allowEntityThreadCreate: Boolean(allowEntityThreadCreate),
      allowMentions: Boolean(allowMentions),
      mentionDailyLimit,
      allowedRoles,
      requireReason: Boolean(requireReason),
    };
    db.prepare('INSERT INTO audit_events (ts, kind, payload_json) VALUES (?, ?, ?)').run(now, 'layerb.policy.upsert', JSON.stringify(payload));
  } catch {}

  return getProjectAgentPolicy({ projectSlug: args.projectSlug, agentHandle });
}

function incrementAgentMentionCounter(db: any, projectId: number, agentHandle: string, day: string) {
  const now = nowIso();
  const row = db
    .prepare('SELECT count FROM agent_mention_counters WHERE project_id=? AND agent_handle=? AND day=?')
    .get(projectId, agentHandle, day) as { count: number } | undefined;
  const next = (row?.count || 0) + 1;
  db.prepare(
    `INSERT INTO agent_mention_counters (project_id, agent_handle, day, count, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(project_id, agent_handle, day) DO UPDATE SET count=excluded.count, updated_at=excluded.updated_at`
  ).run(projectId, agentHandle, day, next, now);
  return next;
}

function getAgentMentionCount(db: any, projectId: number, agentHandle: string, day: string) {
  const row = db
    .prepare('SELECT count FROM agent_mention_counters WHERE project_id=? AND agent_handle=? AND day=?')
    .get(projectId, agentHandle, day) as { count: number } | undefined;
  return row?.count || 0;
}

function isHandleAllowedByRole(db: any, projectId: number, handle: string, allowed: AllowedMentionRole[]) {
  const row = db
    .prepare("SELECT role FROM project_members WHERE project_id=? AND member_handle=? AND member_type='human'")
    .get(projectId, handle) as { role: string } | undefined;
  if (!row) return false;
  const role = row.role === 'owner' ? 'owner' : row.role === 'maintainer' ? 'maintainer' : 'contributor';
  return allowed.includes(role as any);
}

function enforceAgentMentionPolicy(args: {
  projectId: number;
  projectSlug: string;
  agentHandle: string;
  mentionedHandles: string[];
  reason: string | null;
}) {
  const db = getDb();
  const policy = getPolicyRow(db, args.projectId, args.agentHandle);
  const now = nowIso();
  if (!policy) {
    try {
      auditDeny({
        kind: 'layerb.deny',
        ts: now,
        actorHandle: args.agentHandle,
        actorType: 'agent',
        projectSlug: args.projectSlug,
        actionType: 'discussion.mention',
        denyReason: 'not_supported',
        mentionTargets: (args.mentionedHandles || []).map(normalizeUserHandle).filter(Boolean) as string[],
        reasonProvided: Boolean(String(args.reason || '').trim()),
      });
    } catch {}
    throw new Error('not_supported');
  }
  if (!policy.enabled || !policy.allow_mentions) {
    try {
      auditDeny({
        kind: 'layerb.deny',
        ts: now,
        actorHandle: args.agentHandle,
        actorType: 'agent',
        projectSlug: args.projectSlug,
        actionType: 'discussion.mention',
        denyReason: 'forbidden_by_project_agent_policy',
        mentionTargets: (args.mentionedHandles || []).map(normalizeUserHandle).filter(Boolean) as string[],
        reasonProvided: Boolean(String(args.reason || '').trim()),
      });
    } catch {}
    throw new Error('forbidden_by_project_agent_policy');
  }

  const targets = (args.mentionedHandles || []).map(normalizeUserHandle).filter(Boolean) as string[];
  if (!targets.length) return;
  if (targets.length > 1) {
    try {
      auditDeny({
        kind: 'layerb.deny',
        ts: now,
        actorHandle: args.agentHandle,
        actorType: 'agent',
        projectSlug: args.projectSlug,
        actionType: 'discussion.mention',
        denyReason: 'too_many_mentions',
        mentionTargets: targets,
        reasonProvided: Boolean(String(args.reason || '').trim()),
      });
    } catch {}
    throw new Error('too_many_mentions');
  }

  if (policy.require_reason_for_mention && !String(args.reason || '').trim()) {
    try {
      auditDeny({
        kind: 'layerb.deny',
        ts: now,
        actorHandle: args.agentHandle,
        actorType: 'agent',
        projectSlug: args.projectSlug,
        actionType: 'discussion.mention',
        denyReason: 'mention_reason_required',
        mentionTargets: targets,
        reasonProvided: false,
      });
    } catch {}
    throw new Error('mention_reason_required');
  }

  const allowedRoles = parseAllowedRoles(policy.allowed_mention_roles);
  const target = targets[0];
  if (!isHandleAllowedByRole(db, args.projectId, target, allowedRoles)) {
    try {
      auditDeny({
        kind: 'layerb.deny',
        ts: now,
        actorHandle: args.agentHandle,
        actorType: 'agent',
        projectSlug: args.projectSlug,
        actionType: 'discussion.mention',
        denyReason: 'mention_target_not_allowed',
        mentionTargets: [target],
        reasonProvided: Boolean(String(args.reason || '').trim()),
      });
    } catch {}
    throw new Error('mention_target_not_allowed');
  }

  const day = todayStr();
  const used = getAgentMentionCount(db, args.projectId, args.agentHandle, day);
  if (used >= Number(policy.mention_daily_limit || 0)) {
    try {
      auditDeny({
        kind: 'layerb.deny',
        ts: now,
        actorHandle: args.agentHandle,
        actorType: 'agent',
        projectSlug: args.projectSlug,
        actionType: 'discussion.mention',
        denyReason: 'mention_daily_limit_exceeded',
        mentionTargets: [target],
        reasonProvided: Boolean(String(args.reason || '').trim()),
      });
    } catch {}
    throw new Error('mention_daily_limit_exceeded');
  }

  const next = incrementAgentMentionCounter(db, args.projectId, args.agentHandle, day);
  // audit
  try {
    const now = nowIso();
    const payload = {
      kind: 'layerb.agent.mention',
      ts: now,
      projectSlug: args.projectSlug,
      agentHandle: args.agentHandle,
      targets: [target],
      reason: args.reason ? String(args.reason).slice(0, 240) : null,
      usedBefore: used,
      usedAfter: next,
    };
    db.prepare('INSERT INTO audit_events (ts, kind, payload_json) VALUES (?, ?, ?)').run(now, 'layerb.agent.mention', JSON.stringify(payload));
  } catch {}
}

function auditDeny(args: {
  kind: string;
  ts: string;
  actorHandle: string;
  actorType: MemberType;
  projectSlug: string;
  actionType: string;
  denyReason: string;
  entityType?: string | null;
  entityId?: string | null;
  threadId?: string | null;
  replyId?: string | null;
  mentionTargets?: string[] | null;
  reasonProvided?: boolean | null;
}) {
  const db = getDb();
  const payload = {
    kind: args.kind,
    ts: args.ts,
    denied: true,
    actorHandle: args.actorHandle,
    actorType: args.actorType,
    projectSlug: args.projectSlug,
    actionType: args.actionType,
    denyReason: args.denyReason,
    entityType: args.entityType ?? null,
    entityId: args.entityId ?? null,
    threadId: args.threadId ?? null,
    replyId: args.replyId ?? null,
    mentionTargets: args.mentionTargets ?? null,
    reasonProvided: args.reasonProvided ?? null,
  };
  db.prepare('INSERT INTO audit_events (ts, kind, payload_json) VALUES (?, ?, ?)').run(args.ts, args.kind, JSON.stringify(payload));
}

export type DiscussionThreadListItem = {
  id: string;
  projectSlug: string;
  title: string;
  status: DiscussionThreadStatus;
  entityType: DiscussionEntityType;
  entityId: string | null;
  authorHandle: string;
  authorType: MemberType;
  createdAt: string;
  updatedAt: string;
  isLocked: boolean;
  replyCount: number;
  lastReplyAt: string | null;
};

export type DiscussionReply = {
  id: string;
  threadId: string;
  bodyMd: string;
  quotedReplyId: string | null;
  authorHandle: string;
  authorType: MemberType;
  isHidden: boolean;
  hiddenByHandle: string | null;
  hiddenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DiscussionThread = {
  id: string;
  projectSlug: string;
  title: string;
  bodyMd: string;
  status: DiscussionThreadStatus;
  isLocked: boolean;
  entityType: DiscussionEntityType;
  entityId: string | null;
  authorHandle: string;
  authorType: MemberType;
  createdAt: string;
  updatedAt: string;
};

type ReactionTargetType = 'thread' | 'reply';
type ReactionEmoji = '👍' | '👀' | '❤️';

function newReactionId() {
  return `rx-${Math.random().toString(16).slice(2, 6)}${Date.now().toString(16).slice(-4)}`;
}

function isAllowedReactionEmoji(e: string): e is ReactionEmoji {
  return e === '👍' || e === '👀' || e === '❤️';
}

function listReactionCounts(db: any, targetType: ReactionTargetType, targetId: string) {
  const rows = db
    .prepare(
      `SELECT emoji, COUNT(1) as c
       FROM discussion_reactions
       WHERE target_type=? AND target_id=?
       GROUP BY emoji`
    )
    .all(targetType, targetId) as Array<{ emoji: string; c: number }>;
  const out: Record<string, number> = {};
  for (const r of rows) out[String(r.emoji)] = Number(r.c || 0);
  return out;
}

function isProjectMember(projectId: number, handle: string, actorType: MemberType) {
  const db = getDb();
  const row = db
    .prepare('SELECT role FROM project_members WHERE project_id=? AND member_handle=? AND member_type=?')
    .get(projectId, handle, actorType) as { role: string } | undefined;
  return Boolean(row);
}

function parseMentions(bodyMd: string): string[] {
  const text = String(bodyMd || '');
  const out = new Set<string>();
  // Minimal: @handle where handle is [a-zA-Z0-9_]{2,32}
  const re = /@([a-zA-Z0-9_]{2,32})/g;
  for (;;) {
    const m = re.exec(text);
    if (!m) break;
    out.add(m[1]);
  }
  return [...out].slice(0, 20);
}

function newDiscussionThreadId() {
  return `dth-${Math.random().toString(16).slice(2, 6)}${Date.now().toString(16).slice(-4)}`;
}

function newDiscussionReplyId() {
  return `dr-${Math.random().toString(16).slice(2, 6)}${Date.now().toString(16).slice(-4)}`;
}

export function listDiscussionThreadsForProject(args: { projectSlug: string; entityType?: DiscussionEntityType; entityId?: string | null; limit?: number }) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');
  const limit = Math.max(1, Math.min(100, args.limit || 50));
  const entityType = args.entityType || null;
  const entityId = args.entityId ? String(args.entityId) : null;

  let rows: any[] = [];
  if (entityType) {
    rows = db
      .prepare(
        `SELECT id, title, status, is_locked, entity_type, entity_id, author_handle, author_type, created_at, updated_at
         FROM discussion_threads
         WHERE project_id=? AND entity_type=? AND (entity_id IS ? OR entity_id=?)
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .all(p.id, entityType, entityId, entityId, limit) as any[];
  } else {
    rows = db
      .prepare(
        `SELECT id, title, status, is_locked, entity_type, entity_id, author_handle, author_type, created_at, updated_at
         FROM discussion_threads
         WHERE project_id=?
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .all(p.id, limit) as any[];
  }

  const replyCountStmt = db.prepare('SELECT COUNT(1) as c FROM discussion_replies WHERE thread_id=?');
  const lastReplyStmt = db.prepare('SELECT created_at FROM discussion_replies WHERE thread_id=? ORDER BY created_at DESC LIMIT 1');

  return rows.map((r) => {
    const c = replyCountStmt.get(r.id) as { c: number } | undefined;
    const lr = lastReplyStmt.get(r.id) as { created_at: string } | undefined;
    return {
      id: String(r.id),
      projectSlug: args.projectSlug,
      title: String(r.title),
      status: (r.status === 'closed' ? 'closed' : 'open') as DiscussionThreadStatus,
      entityType: (r.entity_type === 'task' ? 'task' : r.entity_type === 'proposal' ? 'proposal' : 'project') as DiscussionEntityType,
      entityId: r.entity_id ? String(r.entity_id) : null,
      authorHandle: String(r.author_handle),
      authorType: r.author_type === 'agent' ? 'agent' : 'human',
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      isLocked: Boolean(r.is_locked),
      replyCount: c?.c || 0,
      lastReplyAt: lr?.created_at || null,
    } as DiscussionThreadListItem;
  });
}

export function getDiscussionThread(args: { projectSlug: string; threadId: string }) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');

  const t = db
    .prepare(
      `SELECT id, title, body_md, status, is_locked, entity_type, entity_id, author_handle, author_type, created_at, updated_at
       FROM discussion_threads
       WHERE id=? AND project_id=?`
    )
    .get(args.threadId, p.id) as any;
  if (!t) throw new Error('thread_not_found');

  const replies = (db
    .prepare(
      `SELECT id, thread_id, body_md, quoted_reply_id, author_handle, author_type, is_hidden, hidden_by_handle, hidden_at, created_at, updated_at
       FROM discussion_replies
       WHERE thread_id=?
       ORDER BY created_at ASC
       LIMIT 300`
    )
    .all(args.threadId) as any[]).map((r) => ({
    id: String(r.id),
    threadId: String(r.thread_id),
    bodyMd: String(r.body_md),
    quotedReplyId: r.quoted_reply_id ? String(r.quoted_reply_id) : null,
    authorHandle: String(r.author_handle),
    authorType: r.author_type === 'agent' ? 'agent' : 'human',
    isHidden: Boolean(r.is_hidden),
    hiddenByHandle: r.hidden_by_handle ? String(r.hidden_by_handle) : null,
    hiddenAt: r.hidden_at ? String(r.hidden_at) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  })) as DiscussionReply[];

  const thread: DiscussionThread = {
    id: String(t.id),
    projectSlug: args.projectSlug,
    title: String(t.title),
    bodyMd: String(t.body_md),
    status: t.status === 'closed' ? 'closed' : 'open',
    isLocked: Boolean(t.is_locked),
    entityType: t.entity_type === 'task' ? 'task' : t.entity_type === 'proposal' ? 'proposal' : 'project',
    entityId: t.entity_id ? String(t.entity_id) : null,
    authorHandle: String(t.author_handle),
    authorType: t.author_type === 'agent' ? 'agent' : 'human',
    createdAt: String(t.created_at),
    updatedAt: String(t.updated_at),
  };

  const threadReactions = listReactionCounts(db, 'thread', String(t.id));
  const replyReactions: Record<string, Record<string, number>> = {};
  for (const r of replies) replyReactions[r.id] = listReactionCounts(db, 'reply', r.id);

  return { thread, replies, reactions: { thread: threadReactions, replies: replyReactions } };
}

export function createDiscussionThread(args: {
  projectSlug: string;
  title: string;
  bodyMd: string;
  authorHandle: string;
  authorType: MemberType;
  entityType: DiscussionEntityType;
  entityId?: string | null;
  mentionReason?: string | null;
}) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');

  const now = nowIso();

  // Default posture: allow agents to create threads as long as they are project members.
  // (Policy remains relevant for higher-risk behaviors like @mentions.)


  if (!isProjectMember(p.id, args.authorHandle, args.authorType)) {
    if (args.authorType === 'agent') {
      try {
        auditDeny({
          kind: 'layerb.deny',
          ts: now,
          actorHandle: args.authorHandle,
          actorType: args.authorType,
          projectSlug: p.slug,
          actionType: 'discussion.thread_create',
          denyReason: 'not_allowed',
          entityType: args.entityType,
          entityId: args.entityId ? String(args.entityId) : null,
        });
      } catch {}
    }
    throw new Error('not_allowed');
  }

  // Layer B gate: agent entity-linked thread create is default OFF unless explicitly allowed.
  if (args.authorType === 'agent' && (args.entityType === 'task' || args.entityType === 'proposal')) {
    const pol = getPolicyRow(db, p.id, args.authorHandle);
    const allowed = !!(pol && pol.enabled && pol.allow_entity_thread_create);
    if (!allowed) {
      try {
        auditDeny({
          kind: 'layerb.deny',
          ts: now,
          actorHandle: args.authorHandle,
          actorType: args.authorType,
          projectSlug: p.slug,
          actionType: 'discussion.thread_create',
          denyReason: 'gated_default_off',
          entityType: args.entityType,
          entityId: args.entityId ? String(args.entityId) : null,
        });
      } catch {}
      throw new Error('not_allowed');
    }
  }

  const title = String(args.title || '').trim();
  const bodyMd = String(args.bodyMd || '').trim();
  if (!title) throw new Error('missing_title');
  if (!bodyMd) throw new Error('missing_body');

  const entityType = args.entityType;
  const entityId = args.entityId ? String(args.entityId) : null;
  if (entityType === 'task' || entityType === 'proposal') {
    if (!entityId) throw new Error('missing_entity');
  }

  const id = newDiscussionThreadId();
  ensureIdentity(args.authorHandle, args.authorType);

  db.prepare(
    `INSERT INTO discussion_threads (id, project_id, title, body_md, author_handle, author_type, entity_type, entity_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, p.id, title, bodyMd, args.authorHandle, args.authorType, entityType, entityId, 'open', now, now);

  // Timeline / dashboard feed source (low noise)
  addDiscussionActivity({
    projectId: p.id,
    ts: now,
    kind: 'discussion.thread_created',
    text: `Discussion thread created: ${id} by @${args.authorHandle} (${args.authorType})`,
    threadId: id,
    threadTitle: title,
    actorHandle: args.authorHandle,
    actorType: args.authorType,
  });

  // Mention notifications
  const mentions = parseMentions(bodyMd);
  if (args.authorType === 'agent') {
    if (mentions.length) {
      // Agent mentions are gated (Layer B) — default OFF.
      enforceAgentMentionPolicy({
        projectId: p.id,
        projectSlug: p.slug,
        agentHandle: args.authorHandle,
        mentionedHandles: mentions,
        reason: args.mentionReason ? String(args.mentionReason) : null,
      });
    }
  }
  for (const m of mentions) {
    if (m === args.authorHandle) continue;
    notifyHuman(m, 'discussion.mention', `Mentioned in discussion: ${title}`, `/projects/${p.slug}/discussions/${id}`);
  }

  return getDiscussionThread({ projectSlug: args.projectSlug, threadId: id }).thread;
}

export function replyToDiscussionThread(args: {
  projectSlug: string;
  threadId: string;
  bodyMd: string;
  quotedReplyId?: string | null;
  mentionReason?: string | null;
  authorHandle: string;
  authorType: MemberType;
}) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');

  if (!isProjectMember(p.id, args.authorHandle, args.authorType)) throw new Error('not_allowed');

  const bodyMd = String(args.bodyMd || '').trim();
  if (!bodyMd) throw new Error('missing_body');

  const t = db
    .prepare('SELECT id, author_handle, author_type, title, status, is_locked FROM discussion_threads WHERE id=? AND project_id=?')
    .get(args.threadId, p.id) as any;
  if (!t) throw new Error('thread_not_found');
  if (t.status === 'closed') {
    try {
      auditDeny({
        kind: 'discussion.deny',
        ts: nowIso(),
        actorHandle: args.authorHandle,
        actorType: args.authorType,
        projectSlug: p.slug,
        actionType: 'discussion.reply_create',
        denyReason: 'thread_closed',
        threadId: String(t.id),
      });
    } catch {}
    throw new Error('thread_closed');
  }
  if (t.is_locked) {
    try {
      auditDeny({
        kind: 'discussion.deny',
        ts: nowIso(),
        actorHandle: args.authorHandle,
        actorType: args.authorType,
        projectSlug: p.slug,
        actionType: 'discussion.reply_create',
        denyReason: 'thread_locked',
        threadId: String(t.id),
      });
    } catch {}
    throw new Error('thread_locked');
  }

  ensureIdentity(args.authorHandle, args.authorType);

  const now = nowIso();
  const id = newDiscussionReplyId();
  db.prepare(
    `INSERT INTO discussion_replies (id, thread_id, body_md, quoted_reply_id, author_handle, author_type, is_hidden, hidden_by_handle, hidden_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?)`
  ).run(id, args.threadId, bodyMd, args.quotedReplyId ? String(args.quotedReplyId) : null, args.authorHandle, args.authorType, now, now);

  db.prepare('UPDATE discussion_threads SET updated_at=? WHERE id=?').run(now, args.threadId);

  // Notify thread author (avoid self)
  const threadAuthor = String(t.author_handle);
  if (threadAuthor && threadAuthor !== args.authorHandle) {
    notifyHuman(threadAuthor, 'discussion.reply', `New reply in discussion: ${String(t.title)}`, `/projects/${p.slug}/discussions/${String(t.id)}`);
  }

  // Timeline / feed source for replies (feed will filter to mentioned-you / your-thread)
  addDiscussionActivity({
    projectId: p.id,
    ts: now,
    kind: 'discussion.reply',
    text: `Discussion reply: ${id} in ${String(t.id)} by @${args.authorHandle} (${args.authorType})`,
    threadId: String(t.id),
    threadTitle: String(t.title),
    actorHandle: args.authorHandle,
    actorType: args.authorType,
    extra: {
      mentionedHandles: parseMentions(bodyMd),
      threadAuthorHandle: String(t.author_handle),
    },
  });

  // Mention notifications (for replies, too)
  const mentions = parseMentions(bodyMd);
  if (args.authorType === 'agent') {
    if (mentions.length) {
      enforceAgentMentionPolicy({
        projectId: p.id,
        projectSlug: p.slug,
        agentHandle: args.authorHandle,
        mentionedHandles: mentions,
        reason: args.mentionReason ? String(args.mentionReason) : null,
      });
    }
  }
  for (const m of mentions) {
    if (m === args.authorHandle) continue;
    notifyHuman(m, 'discussion.mention', `Mentioned in discussion: ${String(t.title)}`, `/projects/${p.slug}/discussions/${String(t.id)}`);
  }

  return {
    id,
    threadId: args.threadId,
    bodyMd,
    quotedReplyId: args.quotedReplyId ? String(args.quotedReplyId) : null,
    authorHandle: args.authorHandle,
    authorType: args.authorType,
    isHidden: false,
    hiddenByHandle: null,
    hiddenAt: null,
    createdAt: now,
    updatedAt: now,
  } as DiscussionReply;
}

export function discussionReaction(args: {
  projectSlug: string;
  targetType: ReactionTargetType;
  targetId: string;
  emoji: string;
  action: 'add' | 'remove';
  actorHandle: string;
  actorType: MemberType;
}) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');

  // v1.5 boundary: agent reactions not supported
  if (args.actorType === 'agent') throw new Error('not_supported');

  if (!isProjectMember(p.id, args.actorHandle, args.actorType)) throw new Error('not_allowed');

  const emoji = String(args.emoji || '').trim();
  if (!isAllowedReactionEmoji(emoji)) throw new Error('invalid_emoji');

  const now = nowIso();
  if (args.action === 'remove') {
    db.prepare('DELETE FROM discussion_reactions WHERE target_type=? AND target_id=? AND emoji=? AND actor_handle=?').run(
      args.targetType,
      args.targetId,
      emoji,
      args.actorHandle
    );
    return { ok: true };
  }

  db.prepare(
    'INSERT OR IGNORE INTO discussion_reactions (id, target_type, target_id, emoji, actor_handle, actor_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(newReactionId(), args.targetType, args.targetId, emoji, args.actorHandle, args.actorType, now);

  return { ok: true };
}

export function setDiscussionThreadLock(args: { projectSlug: string; threadId: string; locked: boolean; actorHandle: string; actorType: MemberType }) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');
  if (args.actorType === 'agent') throw new Error('not_supported');
  if (!isProjectOwnerOrMaintainer(p.id, args.actorHandle)) {
    try {
      auditDeny({
        kind: 'discussion.deny',
        ts: nowIso(),
        actorHandle: args.actorHandle,
        actorType: args.actorType,
        projectSlug: p.slug,
        actionType: 'discussion.thread_lock',
        denyReason: 'not_allowed',
        threadId: args.threadId,
      });
    } catch {}
    throw new Error('not_allowed');
  }

  const now = nowIso();
  db.prepare('UPDATE discussion_threads SET is_locked=?, updated_at=? WHERE id=? AND project_id=?').run(args.locked ? 1 : 0, now, args.threadId, p.id);
  // audit record
  try {
    const payload = { kind: 'discussion.thread_lock', ts: now, actorHandle: args.actorHandle, locked: args.locked, threadId: args.threadId, projectSlug: args.projectSlug };
    db.prepare('INSERT INTO audit_events (ts, kind, payload_json) VALUES (?, ?, ?)').run(now, 'discussion.thread_lock', JSON.stringify(payload));
  } catch {}
  // optional low-noise timeline: include thread lock/unlock
  const t = db.prepare('SELECT title FROM discussion_threads WHERE id=? AND project_id=?').get(args.threadId, p.id) as { title: string } | undefined;
  addDiscussionActivity({
    projectId: p.id,
    ts: now,
    kind: args.locked ? 'discussion.thread_locked' : 'discussion.thread_unlocked',
    text: `${args.locked ? 'Discussion thread locked' : 'Discussion thread unlocked'}: ${args.threadId} by @${args.actorHandle}`,
    threadId: args.threadId,
    threadTitle: t?.title ? String(t.title) : args.threadId,
    actorHandle: args.actorHandle,
    actorType: args.actorType,
  });
  return { ok: true };
}

export function setDiscussionReplyHidden(args: {
  projectSlug: string;
  threadId: string;
  replyId: string;
  hidden: boolean;
  actorHandle: string;
  actorType: MemberType;
}) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');
  if (args.actorType === 'agent') throw new Error('not_supported');
  if (!isProjectOwnerOrMaintainer(p.id, args.actorHandle)) {
    try {
      auditDeny({
        kind: 'discussion.deny',
        ts: nowIso(),
        actorHandle: args.actorHandle,
        actorType: args.actorType,
        projectSlug: p.slug,
        actionType: 'discussion.reply_hide',
        denyReason: 'not_allowed',
        threadId: args.threadId,
        replyId: args.replyId,
      });
    } catch {}
    throw new Error('not_allowed');
  }

  const now = nowIso();
  db.prepare('UPDATE discussion_replies SET is_hidden=?, hidden_by_handle=?, hidden_at=?, updated_at=? WHERE id=?').run(
    args.hidden ? 1 : 0,
    args.hidden ? args.actorHandle : null,
    args.hidden ? now : null,
    now,
    args.replyId
  );

  try {
    const payload = { kind: 'discussion.reply_hide', ts: now, actorHandle: args.actorHandle, hidden: args.hidden, replyId: args.replyId, threadId: args.threadId, projectSlug: args.projectSlug };
    db.prepare('INSERT INTO audit_events (ts, kind, payload_json) VALUES (?, ?, ?)').run(now, 'discussion.reply_hide', JSON.stringify(payload));
  } catch {}

  return { ok: true };
}

export function searchDiscussionsForProject(args: { projectSlug: string; q: string; limit?: number }) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');

  const q = String(args.q || '').trim();
  if (!q) return [];
  const like = `%${q.replace(/%/g, '')}%`;
  const limit = Math.max(1, Math.min(50, args.limit || 20));

  // thread-level results; match title/body or any reply body.
  const rows = db
    .prepare(
      `SELECT t.id as id, t.title as title, t.status as status, t.entity_type as entity_type, t.entity_id as entity_id,
              t.created_at as created_at, t.updated_at as updated_at
       FROM discussion_threads t
       WHERE t.project_id=?
         AND (t.title LIKE ? OR t.body_md LIKE ? OR EXISTS (
           SELECT 1 FROM discussion_replies r
            WHERE r.thread_id=t.id AND r.body_md LIKE ?
         ))
       ORDER BY t.updated_at DESC
       LIMIT ?`
    )
    .all(p.id, like, like, like, limit) as any[];

  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    status: r.status === 'closed' ? 'closed' : 'open',
    entityType: r.entity_type === 'task' ? 'task' : r.entity_type === 'proposal' ? 'proposal' : 'project',
    entityId: r.entity_id ? String(r.entity_id) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }));
}

export function closeDiscussionThread(args: { projectSlug: string; threadId: string; actorHandle: string; actorType: MemberType }) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');

  if (args.actorType === 'agent') throw new Error('not_supported');
  if (!isProjectOwnerOrMaintainer(p.id, args.actorHandle)) throw new Error('not_allowed');

  const now = nowIso();
  db.prepare("UPDATE discussion_threads SET status='closed', updated_at=? WHERE id=? AND project_id=?").run(now, args.threadId, p.id);

  const t = db.prepare('SELECT title FROM discussion_threads WHERE id=? AND project_id=?').get(args.threadId, p.id) as { title: string } | undefined;
  addDiscussionActivity({
    projectId: p.id,
    ts: now,
    kind: 'discussion.thread_closed',
    text: `Discussion thread closed: ${args.threadId} by @${args.actorHandle}`,
    threadId: args.threadId,
    threadTitle: t?.title ? String(t.title) : args.threadId,
    actorHandle: args.actorHandle,
    actorType: args.actorType,
  });

  return { ok: true };
}

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
  // NOTE: showcase demo project seeding disabled (cleanup task: remove demo/test artifacts from DB)
  // ensureShowcaseDemoProject();
  ensureScenarioSeedProjects();
  ensurePhase43Enrichment();
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

function shouldExcludeFromHot(slug: string, name: string) {
  const s = String(slug || '').toLowerCase();
  const n = String(name || '').toLowerCase();
  const bad = ['demo', 'test', 'acceptance', 'bearer', 'authgap', 'verify', 'unclaimed-searchflow'];
  return bad.some((k) => s.includes(k) || n.includes(k));
}

export function listHotProjects7d(args: { days?: number; limit?: number } = {}) {
  const days = Math.max(1, Math.min(30, Number(args.days || 7)));
  const limit = Math.max(1, Math.min(50, Number(args.limit || 10)));

  const db = getDb();

  // Minimal hot ranking (7d):
  // 1) join_count_7d desc
  // 2) updated_at desc (approximated by latest member join/task/proposal/activity ts)
  // 3) created_at desc
  const rows = db
    .prepare(
      `SELECT
         p.id AS id,
         p.slug AS slug,
         p.name AS name,
         p.summary AS summary,
         p.visibility AS visibility,
         p.tags_json AS tags_json,
         p.created_at AS created_at,
         COALESCE(j.joins_7d, 0) AS joins_7d,
         COALESCE(u.updated_at, p.created_at) AS updated_at
       FROM projects p
       LEFT JOIN (
         SELECT project_id, COUNT(*) AS joins_7d
         FROM project_members
         WHERE joined_at >= datetime('now', '-' || ? || ' days')
         GROUP BY project_id
       ) j ON j.project_id = p.id
       LEFT JOIN (
         SELECT project_id, MAX(ts) AS updated_at
         FROM (
           SELECT project_id, ts FROM activity
           UNION ALL
           SELECT project_id, updated_at AS ts FROM tasks
           UNION ALL
           SELECT project_id, updated_at AS ts FROM project_files
           UNION ALL
           SELECT project_id, created_at AS ts FROM proposals
           UNION ALL
           SELECT project_id, joined_at AS ts FROM project_members
         ) x
         GROUP BY project_id
       ) u ON u.project_id = p.id
       ORDER BY joins_7d DESC, updated_at DESC, p.created_at DESC
       LIMIT ?`
    )
    .all(String(days), limit) as Array<{
    id: number;
    slug: string;
    name: string;
    summary: string;
    visibility: string;
    tags_json: string;
    created_at: string;
    joins_7d: number;
    updated_at: string;
  }>;

  return rows
    .filter((r) => !shouldExcludeFromHot(r.slug, r.name))
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      summary: r.summary,
      visibility: (r.visibility === 'restricted' ? 'restricted' : 'open') as Visibility,
      tags: JSON.parse(r.tags_json || '[]') as string[],
      createdAt: r.created_at,
      // expose ranking signals for UI/debug (safe)
      joins7d: Number(r.joins_7d || 0),
      updatedAt: r.updated_at,
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
    .prepare('SELECT ts, text, kind, entity_type, entity_id FROM activity WHERE project_id=? ORDER BY ts DESC LIMIT 50')
    .all(p.id) as ActivityRow[])
    .map((a) => ({
      ts: a.ts,
      text: a.text,
      kind: a.kind || 'event',
      entityType: (a.entity_type as any) || 'unknown',
      entityId: a.entity_id || null,
    }));

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

  const invitations = (db
    .prepare(
      'SELECT id, invitee_handle, invitee_type, role, status, created_by_handle, created_by_type, created_at, accepted_at FROM invitations WHERE project_id=? ORDER BY created_at DESC'
    )
    .all(p.id) as Array<{
    id: string;
    invitee_handle: string;
    invitee_type: string;
    role: string;
    status: string;
    created_by_handle: string;
    created_by_type: string;
    created_at: string;
    accepted_at: string | null;
  }>).map((r) => ({
    id: r.id,
    handle: r.invitee_handle,
    memberType: (r.invitee_type === 'agent' ? 'agent' : 'human') as MemberType,
    role: (r.role === 'owner' ? 'owner' : r.role === 'maintainer' ? 'maintainer' : 'contributor') as MemberRole,
    status: (r.status === 'accepted' ? 'accepted' : r.status === 'revoked' ? 'revoked' : 'pending') as 'pending' | 'accepted' | 'revoked',
    createdByHandle: r.created_by_handle,
    createdByType: (r.created_by_type === 'agent' ? 'agent' : 'human') as MemberType,
    createdAt: r.created_at,
    acceptedAt: r.accepted_at,
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

  const recentAcceptedDeliverables = listRecentAcceptedDeliverables(p.slug, 12).map((d) => ({
    ...d,
    // lightweight add-on field for UI
    __attachmentCount: listAttachmentsForDeliverable(d.id).length,
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
    invitations,
    tasks,
    recentAcceptedDeliverables,
  };
}

export function createProject(args: {
  name: string;
  slug?: string;
  summary: string;
  visibility: Visibility;
  actorHandle: string;
  actorType: MemberType;
  template?: 'general' | 'research' | 'product';
}) {
  const db = getDb();
  const slug = args.slug && args.slug.trim() ? slugify(args.slug) : slugify(args.name);
  if (!slug) throw new Error('invalid_slug');

  const now = nowIso();
  const template = args.template || 'general';
  ensureIdentity(args.actorHandle, args.actorType);
  const tx = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO projects (slug, name, summary, visibility, tags_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        slug,
        args.name.trim(),
        args.summary.trim() || 'No summary',
        args.visibility,
        JSON.stringify(['new', template]),
        now
      );

    const projectId = Number(info.lastInsertRowid);


    const baseFiles = [
      { path: 'README.md', content: `# ${args.name.trim()}\n\n${(args.summary || '').trim()}\n` },
      { path: 'DECISIONS.md', content: '# Decisions\n\n- (empty)\n' },
      { path: 'TODO.md', content: '# TODO\n\n- (empty)\n' },
    ];

    const templateFiles =
      template === 'research'
        ? [
            { path: 'SPEC.md', content: '# Spec\n\n- Problem\n- Goals\n- Non-goals\n- Approach\n' },
            { path: 'NOTES.md', content: '# Notes\n\n- (empty)\n' },
          ]
        : template === 'product'
          ? [
              { path: 'SPEC.md', content: '# Spec\n\n- Problem\n- Goals\n- MVP\n- Risks\n' },
              { path: 'ROADMAP.md', content: '# Roadmap\n\n- Phase 1\n- Phase 2\n- Phase 3\n' },
              { path: 'ARCHITECTURE.md', content: '# Architecture\n\n- (empty)\n' },
            ]
          : [{ path: 'SCOPE.md', content: '# Scope\n\n- (empty)\n' }];

    const files = [...baseFiles, ...templateFiles];

    const ins = db.prepare(
      'INSERT INTO project_files (project_id, path, content, updated_at, last_actor_handle, last_actor_type, last_proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const f of files) ins.run(projectId, f.path, f.content, now, args.actorHandle, args.actorType, null);

    const starterTasks =
      template === 'research'
        ? [
            { title: 'Define research question', description: 'Clarify what we are trying to learn.' },
            { title: 'Collect sources', description: 'Links + notes + primary references.' },
            { title: 'Draft SPEC.md', description: 'Turn findings into a concrete spec.' },
          ]
        : template === 'product'
          ? [
              { title: 'Define MVP scope', description: 'What is the smallest shippable slice?' },
              { title: 'Implement Phase 1', description: 'Start building the core loop.' },
              { title: 'Review & iterate', description: 'Request changes → resubmit → merge.' },
            ]
          : [
              { title: 'Set up initial tasks', description: 'Seed the first meaningful work items.' },
              { title: 'Create first proposal', description: 'Propose a change to a file in the workspace.' },
              { title: 'Run a review loop', description: 'Request changes → resubmit → merge.' },
            ];

    const insTask = db.prepare(
      'INSERT INTO tasks (id, project_id, title, description, status, claimed_by_handle, claimed_by_type, created_at, updated_at, file_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const t of starterTasks) {
      const id = `t-${Math.random().toString(16).slice(2, 6)}${Date.now().toString(16).slice(-4)}`;
      insTask.run(id, projectId, t.title, t.description, 'open', null, null, now, now, null);
    }

    db.prepare('INSERT INTO project_members (project_id, member_handle, member_type, role, joined_at) VALUES (?, ?, ?, ?, ?)').run(
      projectId,
      args.actorHandle,
      args.actorType,
      'owner',
      now
    );

    addActivity({
      projectId,
      ts: now,
      kind: 'project.created',
      entityType: 'project',
      entityId: slug,
      text: `Project created (${args.visibility}) by @${args.actorHandle}`,
    });
  });

  tx();
  return getProject(slug);
}

export type EvidenceLink = { label?: string; url: string };

export type TaskDeliverable = {
  id: string;
  taskId: string;
  projectSlug: string;
  authorHandle: string;
  authorType: MemberType;
  summaryMd: string;
  evidenceLinks: EvidenceLink[];
  status: 'draft' | 'submitted' | 'changes_requested' | 'accepted';
  revisionNote: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
};

// --- Layer B Phase 1: joined-project discussions feed (dashboard module) ---

export type JoinedDiscussionFeedItem = {
  ts: string;
  eventType: 'thread.created' | 'thread.closed' | 'thread.locked' | 'thread.unlocked' | 'reply.mentioned_you' | 'reply.in_your_thread';
  whyShown: 'governance' | 'mentioned_you' | 'your_thread';
  projectSlug: string;
  projectName: string;
  threadId: string;
  threadTitle: string;
  actorHandle: string;
  actorType: MemberType;
  link: string;
};

export function listJoinedProjectsDiscussionFeed(args: { actorHandle: string; actorType: MemberType; limit: number }): JoinedDiscussionFeedItem[] {
  if (args.actorType !== 'human') throw new Error('not_supported');
  const db = getDb();
  const limit = Math.max(1, Math.min(50, Number(args.limit || 20)));

  // Joined projects
  const joined = db
    .prepare(
      `SELECT p.id AS project_id, p.slug AS project_slug, p.name AS project_name
       FROM project_members pm
       JOIN projects p ON p.id=pm.project_id
       WHERE pm.member_handle=? AND pm.member_type='human'`
    )
    .all(args.actorHandle) as { project_id: number; project_slug: string; project_name: string }[];
  if (!joined.length) return [];
  const byId = new Map(joined.map((j) => [j.project_id, j]));
  const ids = joined.map((j) => j.project_id);
  const placeholders = ids.map(() => '?').join(',');

  const rows = db
    .prepare(
      `SELECT a.ts, a.kind, a.actor_handle, a.actor_type, a.project_id, a.thread_id, a.thread_title, a.extra_json
       FROM activity a
       WHERE a.project_id IN (${placeholders})
         AND a.kind IN (
           'discussion.thread_created',
           'discussion.thread_closed',
           'discussion.thread_locked',
           'discussion.thread_unlocked',
           'discussion.reply'
         )
         AND a.thread_id IS NOT NULL
       ORDER BY a.ts DESC
       LIMIT ?`
    )
    .all(...ids, limit * 5) as {
    ts: string;
    kind: string;
    actor_handle: string;
    actor_type: MemberType;
    project_id: number;
    thread_id: string;
    thread_title: string;
    extra_json: string | null;
  }[];

  const out: JoinedDiscussionFeedItem[] = [];
  for (const r of rows) {
    const p = byId.get(r.project_id);
    if (!p) continue;
    const link = `/projects/${p.project_slug}/discussions/${r.thread_id}`;

    if (r.kind === 'discussion.thread_created') {
      out.push({
        ts: r.ts,
        eventType: 'thread.created',
        whyShown: 'governance',
        projectSlug: p.project_slug,
        projectName: p.project_name,
        threadId: r.thread_id,
        threadTitle: r.thread_title,
        actorHandle: r.actor_handle,
        actorType: r.actor_type,
        link,
      });
    } else if (r.kind === 'discussion.thread_closed') {
      out.push({
        ts: r.ts,
        eventType: 'thread.closed',
        whyShown: 'governance',
        projectSlug: p.project_slug,
        projectName: p.project_name,
        threadId: r.thread_id,
        threadTitle: r.thread_title,
        actorHandle: r.actor_handle,
        actorType: r.actor_type,
        link,
      });
    } else if (r.kind === 'discussion.thread_locked') {
      out.push({
        ts: r.ts,
        eventType: 'thread.locked',
        whyShown: 'governance',
        projectSlug: p.project_slug,
        projectName: p.project_name,
        threadId: r.thread_id,
        threadTitle: r.thread_title,
        actorHandle: r.actor_handle,
        actorType: r.actor_type,
        link,
      });
    } else if (r.kind === 'discussion.thread_unlocked') {
      out.push({
        ts: r.ts,
        eventType: 'thread.unlocked',
        whyShown: 'governance',
        projectSlug: p.project_slug,
        projectName: p.project_name,
        threadId: r.thread_id,
        threadTitle: r.thread_title,
        actorHandle: r.actor_handle,
        actorType: r.actor_type,
        link,
      });
    } else if (r.kind === 'discussion.reply') {
      // Low-noise rule: only show reply events if you were mentioned, or you are thread author.
      let extra: any = null;
      try {
        extra = r.extra_json ? JSON.parse(r.extra_json) : null;
      } catch {
        extra = null;
      }
      const mentioned = Array.isArray(extra?.mentionedHandles) ? extra.mentionedHandles.map(String) : [];
      const threadAuthor = extra?.threadAuthorHandle ? String(extra.threadAuthorHandle) : null;
      if (mentioned.includes(args.actorHandle)) {
        out.push({
          ts: r.ts,
          eventType: 'reply.mentioned_you',
          whyShown: 'mentioned_you',
          projectSlug: p.project_slug,
          projectName: p.project_name,
          threadId: r.thread_id,
          threadTitle: r.thread_title,
          actorHandle: r.actor_handle,
          actorType: r.actor_type,
          link,
        });
      } else if (threadAuthor && threadAuthor === args.actorHandle) {
        out.push({
          ts: r.ts,
          eventType: 'reply.in_your_thread',
          whyShown: 'your_thread',
          projectSlug: p.project_slug,
          projectName: p.project_name,
          threadId: r.thread_id,
          threadTitle: r.thread_title,
          actorHandle: r.actor_handle,
          actorType: r.actor_type,
          link,
        });
      }
    }

    if (out.length >= limit) break;
  }

  return out.slice(0, limit);
}

export {
  getDeliverableForTask,
  upsertDeliverableDraft,
  submitDeliverable,
  reviewDeliverable,
  listRecentAcceptedDeliverables,
} from './deliverables';

export {
  listAttachmentsForTask,
  listAttachmentsForDeliverable,
  getAttachmentById,
  createAttachment,
  sanitizeFilename,
  attachmentStoragePath,
} from './attachments';

export { getTaskChildrenWithRollup } from './taskTree';

export type Task = {
  id: string;
  projectSlug: string;
  parentTaskId: string | null;
  title: string;
  description: string;
  status: 'open' | 'claimed' | 'in_progress' | 'completed';
  claimedByHandle: string | null;
  claimedByType: MemberType | null;
  createdAt: string;
  updatedAt: string;
  filePath: string | null;

  // coordination-only blocker signal
  isBlocked: boolean;
  blockedReason: string | null;
  blockedByTaskId: string | null;
};

export function listTasksForProject(projectSlug: string): Task[] {
  const db = getDb();
  const p = getProjectBySlug(projectSlug);
  if (!p) return [];

  const rows = db
    .prepare(
      'SELECT id, parent_task_id, title, description, status, claimed_by_handle, claimed_by_type, created_at, updated_at, file_path, is_blocked, blocked_reason, blocked_by_task_id FROM tasks WHERE project_id=? ORDER BY updated_at DESC'
    )
    .all(p.id) as TaskRow[];

  return rows.map((t) => ({
    id: t.id,
    projectSlug,
    parentTaskId: (t as any).parent_task_id || null,
    title: t.title,
    description: t.description,
    status: (t.status as 'open' | 'claimed' | 'in_progress' | 'completed') || 'open',
    claimedByHandle: t.claimed_by_handle,
    claimedByType: t.claimed_by_type === 'agent' ? 'agent' : t.claimed_by_type === 'human' ? 'human' : null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    filePath: t.file_path,
    isBlocked: !!(t as any).is_blocked,
    blockedReason: (t as any).blocked_reason || null,
    blockedByTaskId: (t as any).blocked_by_task_id || null,
  }));
}

export function createTask(args: {
  projectSlug: string;
  parentTaskId?: string | null;
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
    'INSERT INTO tasks (id, project_id, parent_task_id, title, description, status, claimed_by_handle, claimed_by_type, created_at, updated_at, file_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, p.id, args.parentTaskId || null, args.title.trim() || 'Untitled task', args.description?.trim() || '', 'open', null, null, now, now, args.filePath || null);

  db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id,
    now,
    args.actorHandle,
    args.actorType,
    'created',
    args.title.trim() || 'Untitled task',
    null
  );

  addActivity({
    projectId: p.id,
    ts: now,
    kind: 'task.created',
    entityType: 'task',
    entityId: id,
    text: `Task created: ${id} by @${args.actorHandle} (${args.actorType})`,
  });

  return {
    id,
    projectSlug: args.projectSlug,
    parentTaskId: args.parentTaskId || null,
    title: args.title.trim() || 'Untitled task',
    description: args.description?.trim() || '',
    status: 'open',
    claimedByHandle: null,
    claimedByType: null,
    createdAt: now,
    updatedAt: now,
    filePath: args.filePath || null,
    isBlocked: false,
    blockedReason: null,
    blockedByTaskId: null,
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

    addActivity({
      projectId: t.project_id,
      ts: now,
      kind: `task.${args.action}`,
      entityType: 'task',
      entityId: args.taskId,
      text: `Task ${args.action}: ${args.taskId} by @${args.actorHandle} (${args.actorType})`,
    });
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
      `SELECT t.id, t.parent_task_id, t.title, t.description, t.status, t.claimed_by_handle, t.claimed_by_type, t.created_at, t.updated_at, t.file_path,
              t.is_blocked, t.blocked_reason, t.blocked_by_task_id,
              p.slug as project_slug
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.id=?`
    )
    .get(taskId) as
    | {
        id: string;
        parent_task_id: string | null;
        title: string;
        description: string;
        status: string;
        claimed_by_handle: string | null;
        claimed_by_type: string | null;
        created_at: string;
        updated_at: string;
        file_path: string | null;
        is_blocked: number;
        blocked_reason: string | null;
        blocked_by_task_id: string | null;
        project_slug: string;
      }
    | undefined;
  if (!row) return null;

  return {
    id: row.id,
    projectSlug: row.project_slug,
    parentTaskId: (row as any).parent_task_id || null,
    title: row.title,
    description: row.description,
    status: (row.status as 'open' | 'claimed' | 'in_progress' | 'completed') || 'open',
    claimedByHandle: row.claimed_by_handle,
    claimedByType: row.claimed_by_type === 'agent' ? 'agent' : row.claimed_by_type === 'human' ? 'human' : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    filePath: row.file_path,
    isBlocked: !!row.is_blocked,
    blockedReason: row.blocked_reason || null,
    blockedByTaskId: row.blocked_by_task_id || null,
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

export function listRecentTaskEventsForTasks(taskIds: string[], limit = 20): Array<TaskEvent & { taskId: string }> {
  if (!taskIds.length) return [];
  const db = getDb();

  const out: Array<TaskEvent & { taskId: string }> = [];
  const chunkSize = 80;

  for (let i = 0; i < taskIds.length; i += chunkSize) {
    const chunk = taskIds.slice(i, i + chunkSize);
    const qs = chunk.map(() => '?').join(',');
    const sql =
      'SELECT task_id, ts, actor_handle, actor_type, kind, note, proposal_id FROM task_events ' +
      'WHERE task_id IN (' + qs + ') ORDER BY ts DESC LIMIT ?';

    const rows = db
      .prepare(sql)
      .all(...chunk, limit) as Array<{
      task_id: string;
      ts: string;
      actor_handle: string | null;
      actor_type: string | null;
      kind: string;
      note: string | null;
      proposal_id: string | null;
    }>;

    for (const r of rows) {
      out.push({
        taskId: r.task_id,
        ts: r.ts,
        actorHandle: r.actor_handle,
        actorType: r.actor_type === 'agent' ? 'agent' : r.actor_type === 'human' ? 'human' : null,
        kind: r.kind,
        note: r.note,
        proposalId: r.proposal_id,
      });
    }
  }

  out.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  return out.slice(0, limit);
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

  addActivity({
    projectId: p.id,
    ts: nowIso(),
    kind: 'proposal.opened',
    entityType: 'proposal',
    entityId: id,
    text: `Proposal opened: ${id} (${args.filePath})`,
  });

  // Notify project maintainers/owners (human only) that a proposal needs review.
  const approvers = db
    .prepare("SELECT member_handle FROM project_members WHERE project_id=? AND member_type='human' AND (role='owner' OR role='maintainer')")
    .all(p.id) as Array<{ member_handle: string }>;
  for (const a of approvers) {
    notifyHuman(a.member_handle, 'proposal.needs_review', `Proposal needs review: ${id} → /${p.slug}`, `/proposals/${id}/review`);
  }

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

  addActivity({
    projectId: pr.project_id,
    ts: now,
    kind: 'proposal.updated',
    entityType: 'proposal',
    entityId: args.id,
    text: `Proposal updated: ${args.id} by @${args.actorHandle} (${args.actorType})`,
  });

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
    .prepare('SELECT id, project_id, file_path, new_content, status, task_id, author_handle, author_type FROM proposals WHERE id=?')
    .get(args.id) as {
      id: string;
      project_id: number;
      file_path: string;
      new_content: string;
      status: string;
      task_id: string | null;
      author_handle: string;
      author_type: string;
    }
    | undefined;
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
      addActivity({
        projectId: prRow.project_id,
        ts: now,
        kind: 'proposal.comment',
        entityType: 'proposal',
        entityId: args.id,
        text: `Proposal comment: ${args.id} by @${actorHandle} (${actorType})`,
      });
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
      addActivity({
        projectId: prRow.project_id,
        ts: now,
        kind: 'proposal.approved',
        entityType: 'proposal',
        entityId: args.id,
        text: `Proposal approved: ${args.id} by @${actorHandle} (${actorType})`,
      });
      const link = `/proposals/${args.id}/review`;
      if (prRow.author_type === 'human') notifyHuman(prRow.author_handle, 'proposal.approved', `Your proposal ${args.id} was approved`, link);
      else {
        const ow = getIdentity(prRow.author_handle)?.ownerHandle;
        if (ow) notifyHuman(ow, 'proposal.approved', `Your agent's proposal ${args.id} was approved`, link);
      }
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
      addActivity({
        projectId: prRow.project_id,
        ts: now,
        kind: 'proposal.changes_requested',
        entityType: 'proposal',
        entityId: args.id,
        text: `Changes requested: ${args.id} by @${actorHandle} (${actorType})`,
      });
      const link = `/proposals/${args.id}/review`;
      if (prRow.author_type === 'human') notifyHuman(prRow.author_handle, 'proposal.changes_requested', `Changes requested on your proposal ${args.id}`, link);
      else {
        const ow = getIdentity(prRow.author_handle)?.ownerHandle;
        if (ow) notifyHuman(ow, 'proposal.changes_requested', `Changes requested on your agent's proposal ${args.id}`, link);
      }
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
      addActivity({
        projectId: prRow.project_id,
        ts: now,
        kind: 'proposal.rejected',
        entityType: 'proposal',
        entityId: args.id,
        text: `Proposal rejected: ${args.id} by @${actorHandle} (${actorType})`,
      });
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
      addActivity({
        projectId: prRow.project_id,
        ts: now,
        kind: 'proposal.merged',
        entityType: 'proposal',
        entityId: args.id,
        text: `Merged ${args.id} into ${prRow.file_path} by @${actorHandle} (${actorType})`,
      });
      const link = `/proposals/${args.id}/review`;
      if (prRow.author_type === 'human') notifyHuman(prRow.author_handle, 'proposal.merged', `Your proposal ${args.id} was merged`, link);
      else {
        const ow = getIdentity(prRow.author_handle)?.ownerHandle;
        if (ow) notifyHuman(ow, 'proposal.merged', `Your agent's proposal ${args.id} was merged`, link);
      }

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

  // If there is a pending invite, accept it (works for both open/restricted).
  const inv = db
    .prepare('SELECT id, role, created_by_handle, created_by_type FROM invitations WHERE project_id=? AND invitee_handle=? AND invitee_type=? AND status=?')
    .get(p.id, args.actorHandle, args.actorType, 'pending') as { id: string; role: string; created_by_handle: string; created_by_type: string } | undefined;
	  if (inv) {
    const role = (inv.role === 'owner' ? 'owner' : inv.role === 'maintainer' ? 'maintainer' : 'contributor') as MemberRole;
    const tx = db.transaction(() => {
      db.prepare('UPDATE invitations SET status=?, accepted_at=? WHERE id=?').run('accepted', now, inv.id);
      db.prepare('INSERT INTO project_members (project_id, member_handle, member_type, role, joined_at) VALUES (?, ?, ?, ?, ?)').run(
        p.id,
        args.actorHandle,
        args.actorType,
        role,
        now
      );
	      addActivity({
	        projectId: p.id,
	        ts: now,
	        kind: 'membership.joined',
	        entityType: 'member',
	        entityId: args.actorHandle,
	        text: `@${args.actorHandle} joined (invite)`,
	      });
	    });
    if (inv.created_by_type === 'human') {
      notifyHuman(inv.created_by_handle, 'invite.accepted', `@${args.actorHandle} accepted an invite to /${p.slug}`, `/projects/${p.slug}#people`);
    }
    tx();
    return { mode: 'joined' as const, role };
  }

	  if ((p.visibility === 'restricted' ? 'restricted' : 'open') === 'open') {
    db.prepare('INSERT INTO project_members (project_id, member_handle, member_type, role, joined_at) VALUES (?, ?, ?, ?, ?)').run(
      p.id,
      args.actorHandle,
      args.actorType,
      'contributor',
      now
    );
	    addActivity({
	      projectId: p.id,
	      ts: now,
	      kind: 'membership.joined',
	      entityType: 'member',
	      entityId: args.actorHandle,
	      text: `@${args.actorHandle} joined (open)`,
	    });
	    return { mode: 'joined' as const, role: 'contributor' as const };
	  }

  // If a prior request exists for this member+project (unique constraint), reopen it if it was rejected.
  const existingReq = db
    .prepare('SELECT id, status FROM join_requests WHERE project_id=? AND member_handle=?')
    .get(p.id, args.actorHandle) as { id: string; status: string } | undefined;

  if (existingReq) {
    if (existingReq.status === 'pending') return { mode: 'requested' as const, requestId: existingReq.id };
    if (existingReq.status === 'approved') throw new Error('already_approved');

    // rejected (or other terminal) → reopen as pending.
    db.prepare('UPDATE join_requests SET status=?, reviewed_by=NULL, reviewed_at=NULL, requested_at=? WHERE id=?').run(
      'pending',
      now,
      existingReq.id
    );
	    addActivity({
	      projectId: p.id,
	      ts: now,
	      kind: 'join_request.requested',
	      entityType: 'join_request',
	      entityId: existingReq.id,
	      text: `@${args.actorHandle} re-requested access`,
	    });

    // Notify approvers again.
    const approvers = db
      .prepare("SELECT member_handle FROM project_members WHERE project_id=? AND member_type='human' AND (role='owner' OR role='maintainer')")
      .all(p.id) as Array<{ member_handle: string }>;
    for (const a of approvers) {
      notifyHuman(a.member_handle, 'join.requested', `Join request: @${args.actorHandle} → /${p.slug}`, `/projects/${p.slug}#people`);
    }

    return { mode: 'requested' as const, requestId: existingReq.id };
  }

  const id = `jr-${Math.random().toString(16).slice(2, 6)}${Date.now().toString(16).slice(-4)}`;
  db.prepare(
    'INSERT INTO join_requests (id, project_id, member_handle, member_type, requested_at, status, reviewed_by, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, p.id, args.actorHandle, args.actorType, now, 'pending', null, null);
	  addActivity({
	    projectId: p.id,
	    ts: now,
	    kind: 'join_request.requested',
	    entityType: 'join_request',
	    entityId: id,
	    text: `@${args.actorHandle} requested access`,
	  });

  // task event (best-effort): link project-level join_request into a parent task stream
  try {
    const root = db.prepare('SELECT id FROM tasks WHERE project_id=? AND parent_task_id IS NULL ORDER BY created_at ASC LIMIT 1').get(p.id) as { id: string } | undefined;
    if (root?.id) {
      db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        root.id,
        now,
        args.actorHandle,
        args.actorType,
        'join_request.created',
        `jr:${id} @${args.actorHandle}`,
        null
      );
    }
  } catch {}

  // Pre-summary (no AI): compute an explainable recommendation from lightweight signals.
  const priorMember = db
    .prepare('SELECT role FROM project_members WHERE project_id=? AND member_handle=?')
    .get(p.id, args.actorHandle) as { role: string } | undefined;

  const priorInvite = db
    .prepare("SELECT status FROM invitations WHERE project_id=? AND invitee_handle=? AND status IN ('pending','accepted')")
    .get(p.id, args.actorHandle) as { status: 'pending' | 'accepted' } | undefined;

  const idRow = db
    .prepare("SELECT created_at FROM identities WHERE handle=?")
    .get(args.actorHandle) as { created_at: string } | undefined;

  const recentTaskTitles = (db
    .prepare(
      `SELECT title FROM tasks
       WHERE (claimed_by_handle=? AND claimed_by_type=?)
       ORDER BY updated_at DESC LIMIT 5`
    )
    .all(args.actorHandle, args.actorType) as Array<{ title: string }>).
    map((r) => String(r.title || ''));

  const recentProposalTexts = (db
    .prepare(
      `SELECT title, summary FROM proposals
       WHERE author_handle=? AND author_type=?
       ORDER BY created_at DESC LIMIT 5`
    )
    .all(args.actorHandle, args.actorType) as Array<{ title: string; summary: string }>).
    flatMap((r) => [String(r.title || ''), String(r.summary || '')]);

  const pre = computeJoinRequestPreSummary({
    requesterHandle: args.actorHandle,
    requesterType: args.actorType,
    project: { id: p.id, slug: p.slug, name: p.name },
    requester: { createdAt: idRow?.created_at || null },
    prior: { alreadyMember: Boolean(priorMember), priorInviteStatus: priorInvite?.status || null },
    recent: { taskTitles: recentTaskTitles, proposalTexts: recentProposalTexts },
  });

  const preSummary = JSON.stringify(pre);

  try {
    db.prepare('UPDATE join_requests SET pre_summary=? WHERE id=?').run(preSummary, id);
  } catch {
    // ignore if column missing on older DBs
  }

  // Notify project maintainers/owners (human only) so join requests aren't missed during pilot.
  const approvers = db
    .prepare("SELECT member_handle FROM project_members WHERE project_id=? AND member_type='human' AND (role='owner' OR role='maintainer')")
    .all(p.id) as Array<{ member_handle: string }>;
  for (const a of approvers) {
    notifyHuman(a.member_handle, 'join.requested', `Join request: @${args.actorHandle} → /${p.slug}`, `/projects/${p.slug}#people`);
  }

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
      addActivity({
        projectId: r.project_id,
        ts: now,
        kind: 'join_request.approved',
        entityType: 'join_request',
        entityId: r.id,
        text: `Access approved for @${r.member_handle}`,
      });

      // best-effort task event
      try {
        const root = db.prepare('SELECT id FROM tasks WHERE project_id=? AND parent_task_id IS NULL ORDER BY created_at ASC LIMIT 1').get(r.project_id) as { id: string } | undefined;
        if (root?.id) {
          db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            root.id,
            now,
            args.actorHandle,
            'human',
            'join_request.approved',
            `jr:${r.id} @${r.member_handle}`,
            null
          );
          db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            root.id,
            now,
            r.member_handle,
            (r.member_type === 'agent' ? 'agent' : 'human'),
            'membership.joined',
            `@${r.member_handle} (${r.member_type}) via join_request`,
            null
          );
        }
      } catch {}
      if (r.member_type !== 'agent') {
        const slugRow = db.prepare('SELECT slug FROM projects WHERE id=?').get(r.project_id) as { slug: string } | undefined;
        if (slugRow) notifyHuman(r.member_handle, 'join.approved', `Your access request was approved for /${slugRow.slug}`, `/projects/${slugRow.slug}`);
      }
    }

    if (args.action === 'reject') {
      db.prepare('UPDATE join_requests SET status=?, reviewed_by=?, reviewed_at=? WHERE id=?').run('rejected', args.actorHandle, now, r.id);
      addActivity({
        projectId: r.project_id,
        ts: now,
        kind: 'join_request.rejected',
        entityType: 'join_request',
        entityId: r.id,
        text: `Access rejected for @${r.member_handle}`,
      });

      // best-effort task event
      try {
        const root = db.prepare('SELECT id FROM tasks WHERE project_id=? AND parent_task_id IS NULL ORDER BY created_at ASC LIMIT 1').get(r.project_id) as { id: string } | undefined;
        if (root?.id) {
          db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            root.id,
            now,
            args.actorHandle,
            'human',
            'join_request.rejected',
            `jr:${r.id} @${r.member_handle}`,
            null
          );
        }
      } catch {}
      if (r.member_type !== 'agent') {
        const slugRow = db.prepare('SELECT slug FROM projects WHERE id=?').get(r.project_id) as { slug: string } | undefined;
        if (slugRow) notifyHuman(r.member_handle, 'join.rejected', `Your access request was rejected for /${slugRow.slug}`, `/projects/${slugRow.slug}`);
      }
    }
  });

  tx();
  return { ok: true };
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

export function listInvitations(projectSlug: string) {
  const db = getDb();
  const p = getProjectBySlug(projectSlug);
  if (!p) throw new Error('project_not_found');

  return (db
    .prepare(
      'SELECT id, invitee_handle, invitee_type, role, status, created_by_handle, created_by_type, created_at, accepted_at FROM invitations WHERE project_id=? ORDER BY created_at DESC'
    )
    .all(p.id) as Array<{
    id: string;
    invitee_handle: string;
    invitee_type: string;
    role: string;
    status: string;
    created_by_handle: string;
    created_by_type: string;
    created_at: string;
    accepted_at: string | null;
  }>).map((r) => ({
    id: r.id,
    handle: r.invitee_handle,
    memberType: (r.invitee_type === 'agent' ? 'agent' : 'human') as MemberType,
    role: (r.role === 'owner' ? 'owner' : r.role === 'maintainer' ? 'maintainer' : 'contributor') as MemberRole,
    status: (r.status === 'accepted' ? 'accepted' : r.status === 'declined' ? 'declined' : r.status === 'revoked' ? 'revoked' : 'pending') as InvitationStatus,
    createdByHandle: r.created_by_handle,
    createdByType: (r.created_by_type === 'agent' ? 'agent' : 'human') as MemberType,
    createdAt: r.created_at,
    acceptedAt: r.accepted_at,
  }));
}

export function createInvitation(args: {
  projectSlug: string;
  inviteeHandle: string;
  inviteeType: MemberType;
  role: MemberRole;
  actorHandle: string;
  actorType: MemberType;
}) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');
  if (!isProjectOwnerOrMaintainer(p.id, args.actorHandle)) throw new Error('not_allowed');

  const now = nowIso();
  const id = `inv-${Math.random().toString(16).slice(2, 6)}${Date.now().toString(16).slice(-4)}`;
  ensureIdentity(args.inviteeHandle, args.inviteeType);

  db.prepare(
    `INSERT INTO invitations (id, project_id, invitee_handle, invitee_type, role, status, created_by_handle, created_by_type, created_at, accepted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(project_id, invitee_handle, invitee_type) DO UPDATE SET role=excluded.role, status='pending', created_by_handle=excluded.created_by_handle, created_by_type=excluded.created_by_type, created_at=excluded.created_at, accepted_at=NULL`
  ).run(id, p.id, args.inviteeHandle, args.inviteeType, args.role, 'pending', args.actorHandle, args.actorType, now, null);

  addActivity({
    projectId: p.id,
    ts: now,
    kind: 'invite.created',
    entityType: 'invite',
    entityId: id,
    text: `Invited @${args.inviteeHandle} (${args.inviteeType}) as ${args.role}`,
  });

  // best-effort task event
  try {
    const root = db.prepare('SELECT id FROM tasks WHERE project_id=? AND parent_task_id IS NULL ORDER BY created_at ASC LIMIT 1').get(p.id) as { id: string } | undefined;
    if (root?.id) {
      db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        root.id,
        now,
        args.actorHandle,
        args.actorType,
        'invite.created',
        `inv:${id} @${args.inviteeHandle}`,
        null
      );
    }
  } catch {}

  if (args.inviteeType === 'human') {
    notifyHuman(args.inviteeHandle, 'invite.created', `You were invited to /${p.slug} as ${args.role}`, `/projects/${p.slug}#people`);
  } else {
    // For agents: deliver into the agent's own inbox feed (userHandle = agent handle).
    notifyHuman(args.inviteeHandle, 'invite.created', `Invite: /${p.slug} as ${args.role} (accept/decline in Inbox)`, `/inbox`);
  }

  return { ok: true };
}

export function invitationAction(args: { id: string; action: 'revoke'; actorHandle: string }) {
  const db = getDb();
  const inv = db.prepare('SELECT id, project_id, invitee_handle, invitee_type, role, status FROM invitations WHERE id=?').get(args.id) as
    | { id: string; project_id: number; invitee_handle: string; invitee_type: string; role: string; status: string }
    | undefined;
  if (!inv) throw new Error('invite_not_found');
  if (!isProjectOwnerOrMaintainer(inv.project_id, args.actorHandle)) throw new Error('not_allowed');

  const now = nowIso();
  db.prepare('UPDATE invitations SET status=? WHERE id=?').run('revoked', inv.id);
  addActivity({
    projectId: inv.project_id,
    ts: now,
    kind: 'invite.revoked',
    entityType: 'invite',
    entityId: inv.id,
    text: `Invite revoked for @${inv.invitee_handle}`,
  });

  // Notify invitee (human only) that the invite was revoked.
  if (inv.invitee_type === 'human') {
    const slugRow = db.prepare('SELECT slug FROM projects WHERE id=?').get(inv.project_id) as { slug: string } | undefined;
    if (slugRow) notifyHuman(inv.invitee_handle, 'invite.revoked', `Invite revoked: /${slugRow.slug}`, `/projects/${slugRow.slug}#people`);
  }

  return { ok: true };
}

export function listInvitationsForInvitee(args: { inviteeHandle: string }) {
  const db = getDb();
  const h = normalizeUserHandle(args.inviteeHandle) || String(args.inviteeHandle || '').trim();
  if (!h) throw new Error('invalid_invitee');

  const rows = db
    .prepare(
      `SELECT
         i.id AS id,
         i.invitee_handle AS invitee_handle,
         i.invitee_type AS invitee_type,
         i.role AS role,
         i.status AS status,
         i.created_by_handle AS created_by_handle,
         i.created_by_type AS created_by_type,
         i.created_at AS created_at,
         p.slug AS project_slug,
         p.name AS project_name,
         p.visibility AS visibility
       FROM invitations i
       JOIN projects p ON p.id = i.project_id
       WHERE i.invitee_handle=?
         AND i.status='pending'
       ORDER BY i.created_at DESC
       LIMIT 100`
    )
    .all(h) as Array<{
    id: string;
    invitee_handle: string;
    invitee_type: string;
    role: string;
    status: string;
    created_by_handle: string;
    created_by_type: string;
    created_at: string;
    project_slug: string;
    project_name: string;
    visibility: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    status: (r.status === 'pending' ? 'pending' : 'pending') as InvitationStatus,
    role: (r.role === 'owner' ? 'owner' : r.role === 'maintainer' ? 'maintainer' : 'contributor') as MemberRole,
    invitee: { handle: r.invitee_handle, type: r.invitee_type === 'agent' ? 'agent' : 'human' },
    inviter: { handle: r.created_by_handle, type: r.created_by_type === 'agent' ? 'agent' : 'human' },
    createdAt: r.created_at,
    project: { slug: r.project_slug, name: r.project_name, visibility: r.visibility === 'restricted' ? 'restricted' : 'open' },
  }));
}

export function respondToInvitation(args: { id: string; action: 'accept' | 'decline'; actorHandle: string; actorType: MemberType }) {
  const db = getDb();
  const now = nowIso();

  const inv = db
    .prepare('SELECT id, project_id, invitee_handle, invitee_type, role, status FROM invitations WHERE id=?')
    .get(args.id) as
    | { id: string; project_id: number; invitee_handle: string; invitee_type: string; role: string; status: string }
    | undefined;

  if (!inv) throw new Error('invite_not_found');
  if (inv.status !== 'pending') throw new Error('invite_not_pending');

  // Only the invitee can accept/decline.
  if (inv.invitee_handle !== args.actorHandle) throw new Error('not_invitee');

  if (args.action === 'decline') {
    db.prepare('UPDATE invitations SET status=?, accepted_at=NULL WHERE id=?').run('declined', inv.id);
    addActivity({
      projectId: inv.project_id,
      ts: now,
      kind: 'invite.declined',
      entityType: 'invite',
      entityId: inv.id,
      text: `Invite declined by @${inv.invitee_handle}`,
    });

    // best-effort task event
    try {
      const root = db.prepare('SELECT id FROM tasks WHERE project_id=? AND parent_task_id IS NULL ORDER BY created_at ASC LIMIT 1').get(inv.project_id) as { id: string } | undefined;
      if (root?.id) {
        db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          root.id,
          now,
          args.actorHandle,
          args.actorType,
          'invite.declined',
          `inv:${inv.id} @${inv.invitee_handle}`,
          null
        );
      }
    } catch {}

    return { ok: true, status: 'declined' as const };
  }

  // accept
  const role = (inv.role === 'owner' ? 'owner' : inv.role === 'maintainer' ? 'maintainer' : 'contributor') as MemberRole;
  const memberType: MemberType = inv.invitee_type === 'agent' ? 'agent' : 'human';

  const tx = db.transaction(() => {
    db.prepare('UPDATE invitations SET status=?, accepted_at=? WHERE id=?').run('accepted', now, inv.id);
    db.prepare('INSERT OR IGNORE INTO project_members (project_id, member_handle, member_type, role, joined_at) VALUES (?, ?, ?, ?, ?)').run(
      inv.project_id,
      inv.invitee_handle,
      memberType,
      role,
      now
    );
    addActivity({
      projectId: inv.project_id,
      ts: now,
      kind: 'invite.accepted',
      entityType: 'invite',
      entityId: inv.id,
      text: `@${inv.invitee_handle} joined (invite)`,
    });

    // best-effort task events
    try {
      const root = db.prepare('SELECT id FROM tasks WHERE project_id=? AND parent_task_id IS NULL ORDER BY created_at ASC LIMIT 1').get(inv.project_id) as { id: string } | undefined;
      if (root?.id) {
        db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          root.id,
          now,
          args.actorHandle,
          args.actorType,
          'invite.accepted',
          `inv:${inv.id} @${inv.invitee_handle}`,
          null
        );
        db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          root.id,
          now,
          inv.invitee_handle,
          memberType,
          'membership.joined',
          `@${inv.invitee_handle} (${memberType}) via invite`,
          null
        );
      }
    } catch {}
  });

  tx();
  return { ok: true, status: 'accepted' as const, role };
}

export function memberAction(args: {
  projectSlug: string;
  action: 'set_role' | 'remove';
  memberHandle: string;
  memberType: MemberType;
  role?: MemberRole;
  actorHandle: string;
}) {
  const db = getDb();
  const p = getProjectBySlug(args.projectSlug);
  if (!p) throw new Error('project_not_found');
  if (!isProjectOwnerOrMaintainer(p.id, args.actorHandle)) throw new Error('not_allowed');

  const now = nowIso();

  if (args.action === 'set_role') {
    const role = args.role || 'contributor';
    db.prepare('UPDATE project_members SET role=? WHERE project_id=? AND member_handle=? AND member_type=?').run(
      role,
      p.id,
      args.memberHandle,
      args.memberType
    );
    db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(p.id, now, `Role updated: @${args.memberHandle} → ${role}`);
  }

  if (args.action === 'remove') {
    db.prepare('DELETE FROM project_members WHERE project_id=? AND member_handle=? AND member_type=?').run(p.id, args.memberHandle, args.memberType);
    db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(p.id, now, `Member removed: @${args.memberHandle}`);

    // best-effort task event
    try {
      const root = db.prepare('SELECT id FROM tasks WHERE project_id=? AND parent_task_id IS NULL ORDER BY created_at ASC LIMIT 1').get(p.id) as { id: string } | undefined;
      if (root?.id) {
        db.prepare('INSERT INTO task_events (task_id, ts, actor_handle, actor_type, kind, note, proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          root.id,
          now,
          args.actorHandle,
          'human',
          'membership.removed',
          `@${args.memberHandle} (${args.memberType})`,
          null
        );
      }
    } catch {}
  }

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

  // Default-flow hardening (market-safe): do not auto-join on intake.
  // Bind identity + return a recommended next step; join requires explicit follow-up.
  const projectSlug = String(args.projectSlug || '').trim();
  return {
    identity: getIdentity(handle),
    bindingToken,
    nextSuggestedAction: 'join_project',
    recommendedJoin: projectSlug ? {
      projectSlug,
      endpoint: `/api/projects/${projectSlug}/join`,
      method: 'POST',
      auth: 'agentBearer',
      body: { actorHandle: handle, actorType: 'agent' },
    } : null,
  };
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

  // Ensure DECISIONS.md isn't empty.
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

  // Ensure an in-product pilot guide file exists inside the living workspace.
  // (This is separate from repo docs; this is what pilot participants see in the project file list.)
  db.prepare(
    `INSERT OR IGNORE INTO project_files (project_id, path, content, updated_at, last_actor_handle, last_actor_type, last_proposal_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    pid,
    'PILOT.md',
    [
      '# Internal Pilot (living doc)',
      '',
      'This project (a2a-site) is the primary living workspace for the internal pilot.',
      '',
      'Suggested path:',
      '- Owner/Maintainer: create/triage tasks, review proposals, merge.',
      '- Invited human collaborator: join, pick a task, comment/review.',
      '- External/OpenClaw-style agent: bind via /intake/agent and propose changes.',
      '',
      'Capture feedback in: docs/pilot-feedback-template.md (repo) or convert it into tasks here.',
    ].join('\n') + '\n',
    now,
    'local-human',
    'human',
    null
  );

  // Seed (or top up) a small pilot task set.
  const existingTitles = new Set(
    (db.prepare('SELECT title FROM tasks WHERE project_id=?').all(pid) as Array<{ title: string }>).map((r) => r.title)
  );

  const wanted: Array<{ title: string; description: string; filePath: string | null; actorHandle: string; actorType: MemberType }> = [
    {
      title: 'Pilot: owner/maintainer kickoff checklist',
      description: 'Run the internal pilot checklist and confirm the loop works end-to-end.',
      filePath: 'PILOT.md',
      actorHandle: 'local-human',
      actorType: 'human',
    },
    {
      title: 'Pilot: invite a human collaborator (restricted project drill)',
      description: 'Create a restricted project, send invite, approve join request, verify role updates.',
      filePath: 'PILOT.md',
      actorHandle: 'local-human',
      actorType: 'human',
    },
    {
      title: 'Pilot: bind an external agent via intake',
      description: 'Use /intake/agent to bind an agent handle, then have it join and post runtime/presence.',
      filePath: 'PILOT.md',
      actorHandle: 'local-human',
      actorType: 'human',
    },
    {
      title: 'Pilot: run request-changes loop on a proposal',
      description: 'Agent proposes → maintainer requests changes → agent updates → maintainer approves → merge.',
      filePath: 'README.md',
      actorHandle: 'local-human',
      actorType: 'human',
    },
    {
      title: 'Pilot: verify inbox usefulness (triage)',
      description: 'Generate a few notifications (invite, join approval, proposal review) and triage them via /inbox.',
      filePath: null,
      actorHandle: 'local-human',
      actorType: 'human',
    },
    {
      title: 'Pilot: verify search usefulness',
      description: 'Search for a task id, proposal id, file path, and agent handle; confirm results are navigable.',
      filePath: null,
      actorHandle: 'local-human',
      actorType: 'human',
    },
  ];

  for (const w of wanted) {
    if (existingTitles.has(w.title)) continue;
    createTask({
      projectSlug: slug,
      title: w.title,
      description: w.description,
      filePath: w.filePath,
      actorHandle: w.actorHandle,
      actorType: w.actorType,
    });
  }
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
    summary: 'Add explicit "verify signature + sidecar + text_complete" steps.',
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

function ensureScenarioSeedProjects() {
  const db = getDb();
  const now = nowIso();

  // Deterministic seed identities (humans + agents) for multi-project evaluation.
  const humans = [
    { handle: 'seed_owner', displayName: 'Seed Owner' },
    { handle: 'seed_alex', displayName: 'Alex (Ops)' },
    { handle: 'seed_bella', displayName: 'Bella (PM)' },
    { handle: 'seed_chris', displayName: 'Chris (Design)' },
    { handle: 'seed_dana', displayName: 'Dana (Research)' },
  ];

  for (const h of humans) {
    if (!getUserByHandle(h.handle)) {
      try { createUser({ handle: h.handle, displayName: h.displayName }); } catch {}
    }
    ensureIdentity(h.handle, 'human');
  }

  const agents = [
    { handle: 'seed_agent_builder', displayName: 'Builder Agent' },
    { handle: 'seed_agent_reviewer', displayName: 'Reviewer Agent' },
    { handle: 'seed_agent_research', displayName: 'Research Agent' },
    { handle: 'seed_agent_ops', displayName: 'Ops Agent' },
  ];

  for (const a of agents) {
    if (!getIdentity(a.handle)) {
      try { createAgentIdentity({ handle: a.handle, displayName: a.displayName }); } catch {}
    }
  }

  const scenarios: Array<{
    slug: string;
    name: string;
    summary: string;
    visibility: Visibility;
    template: 'general' | 'research' | 'product';
    owner: string;
    members: Array<{ handle: string; type: MemberType; role: MemberRole }>;
    externalAgents?: Array<{ handle: string; displayName: string; runtime?: Record<string, unknown> }>;
    extraFiles: Array<{ path: string; content: string }>;
    extraTasks: Array<{ title: string; description: string; filePath?: string | null; actor?: { handle: string; type: MemberType } }>;
    // proposals are created only if missing by title
    proposals: Array<{
      title: string;
      summary: string;
      filePath: string;
      author: { handle: string; type: MemberType };
      flow: 'merge' | 'needs_review' | 'request_changes_loop';
    }>;
    decisions: string[];
  }> = [
    {
      slug: 'product-alpha',
      name: 'Product Alpha',
      summary: 'Product build workspace: MVP scope, roadmap, and release notes.',
      visibility: 'open',
      template: 'product',
      owner: 'seed_owner',
      members: [
        { handle: 'seed_owner', type: 'human', role: 'owner' },
        { handle: 'seed_bella', type: 'human', role: 'maintainer' },
        { handle: 'seed_agent_builder', type: 'agent', role: 'contributor' },
      ],
      extraFiles: [
        { path: 'RELEASE_NOTES.md', content: '# Release notes\n\n- v0.1: internal pilot\n' },
        { path: 'MEETING_NOTES.md', content: '# Meeting notes\n\n- (empty)\n' },
      ],
      extraTasks: [
        { title: 'Define onboarding copy', description: 'Tighten /start and project entry copy for first-time users.', filePath: 'README.md' },
        { title: 'QA the request-changes loop', description: 'Run propose → request changes → update → approve → merge.', filePath: 'SPEC.md', actor: { handle: 'seed_agent_reviewer', type: 'agent' } },
      ],
      proposals: [
        {
          title: 'Add MVP section to SPEC',
          summary: 'Clarify MVP scope in SPEC.md',
          filePath: 'SPEC.md',
          author: { handle: 'seed_agent_builder', type: 'agent' },
          flow: 'merge',
        },
        {
          title: 'Draft release notes scaffold',
          summary: 'Create a minimal release notes format.',
          filePath: 'RELEASE_NOTES.md',
          author: { handle: 'seed_bella', type: 'human' },
          flow: 'needs_review',
        },
      ],
      decisions: ['Prefer small proposals (1 file) for early pilots.', 'Keep review notes short and actionable.'],
    },
    {
      slug: 'research-briefs',
      name: 'Research Briefs',
      summary: 'Research/spec workflow: sources → notes → spec.',
      visibility: 'open',
      template: 'research',
      owner: 'seed_dana',
      members: [
        { handle: 'seed_dana', type: 'human', role: 'owner' },
        { handle: 'seed_agent_research', type: 'agent', role: 'contributor' },
      ],
      extraFiles: [
        { path: 'SOURCES.md', content: '# Sources\n\n- (empty)\n' },
        { path: 'FINDINGS.md', content: '# Findings\n\n- (empty)\n' },
      ],
      extraTasks: [
        { title: 'Summarize 3 competitor flows', description: 'Capture key flow steps and UX friction points.', filePath: 'FINDINGS.md', actor: { handle: 'seed_agent_research', type: 'agent' } },
        { title: 'Turn findings into SPEC updates', description: 'Update SPEC.md with concrete recommendations.', filePath: 'SPEC.md' },
      ],
      proposals: [
        {
          title: 'Add findings structure',
          summary: 'Seed headings for FINDINGS.md',
          filePath: 'FINDINGS.md',
          author: { handle: 'seed_agent_research', type: 'agent' },
          flow: 'merge',
        },
        {
          title: 'Rewrite spec goals section',
          summary: 'Make goals testable.',
          filePath: 'SPEC.md',
          author: { handle: 'seed_dana', type: 'human' },
          flow: 'needs_review',
        },
      ],
      decisions: ['Research output must map to a concrete SPEC change.', 'Prefer short briefs over long reports.'],
    },
    {
      slug: 'content-studio',
      name: 'Content Studio',
      summary: 'Creator workflow: briefs, drafts, edits, publish checklist.',
      visibility: 'open',
      template: 'general',
      owner: 'seed_bella',
      members: [
        { handle: 'seed_bella', type: 'human', role: 'owner' },
        { handle: 'seed_chris', type: 'human', role: 'contributor' },
        { handle: 'seed_agent_reviewer', type: 'agent', role: 'contributor' },
      ],
      extraFiles: [
        { path: 'BRIEFS.md', content: '# Briefs\n\n- (empty)\n' },
        { path: 'DRAFTS.md', content: '# Drafts\n\n- (empty)\n' },
        { path: 'PUBLISH_CHECKLIST.md', content: '# Publish checklist\n\n- (empty)\n' },
      ],
      extraTasks: [
        { title: 'Draft pilot announcement', description: 'Write a short internal pilot announcement post.', filePath: 'DRAFTS.md' },
        { title: 'Review wording for clarity', description: 'Ensure tone is direct and actionable.', filePath: 'DRAFTS.md', actor: { handle: 'seed_agent_reviewer', type: 'agent' } },
      ],
      proposals: [
        {
          title: 'Add publish checklist v0',
          summary: 'Seed a minimal publish checklist.',
          filePath: 'PUBLISH_CHECKLIST.md',
          author: { handle: 'seed_chris', type: 'human' },
          flow: 'merge',
        },
        {
          title: 'Draft announcement copy',
          summary: 'Initial draft for internal pilot post.',
          filePath: 'DRAFTS.md',
          author: { handle: 'seed_bella', type: 'human' },
          flow: 'needs_review',
        },
      ],
      decisions: ['Prefer short drafts that are easy to review.', 'Keep checklists minimal and executable.'],
    },
    {
      slug: 'community-ops',
      name: 'Community Ops',
      summary: 'Community operations: triage, moderation, playbooks, weekly metrics.',
      visibility: 'restricted',
      template: 'general',
      owner: 'seed_alex',
      members: [
        { handle: 'seed_alex', type: 'human', role: 'owner' },
        { handle: 'seed_agent_ops', type: 'agent', role: 'contributor' },
      ],
      extraFiles: [
        { path: 'PLAYBOOK.md', content: '# Playbook\n\n- Triage\n- Response templates\n- Escalation\n' },
        { path: 'WEEKLY_METRICS.md', content: '# Weekly metrics\n\n- (empty)\n' },
      ],
      extraTasks: [
        { title: 'Triage backlog cleanup', description: 'Close stale items, tag active ones.', filePath: 'PLAYBOOK.md' },
        { title: 'Draft weekly metrics format', description: 'Define the weekly snapshot fields.', filePath: 'WEEKLY_METRICS.md', actor: { handle: 'seed_agent_ops', type: 'agent' } },
      ],
      proposals: [
        {
          title: 'Add escalation rules',
          summary: 'Add a simple escalation decision tree.',
          filePath: 'PLAYBOOK.md',
          author: { handle: 'seed_alex', type: 'human' },
          flow: 'merge',
        },
        {
          title: 'Seed weekly metrics',
          summary: 'Add headings and definitions for weekly metrics.',
          filePath: 'WEEKLY_METRICS.md',
          author: { handle: 'seed_agent_ops', type: 'agent' },
          flow: 'needs_review',
        },
      ],
      decisions: ['Restricted: moderation actions require approval.', 'Metrics should be stable week to week.'],
    },
    {
      slug: 'hackathon-incubator',
      name: 'Hackathon Incubator',
      summary: 'Hackathon/incubation workspace: ideas, teams, pitch deck, demo plan.',
      visibility: 'open',
      template: 'product',
      owner: 'seed_owner',
      members: [
        { handle: 'seed_owner', type: 'human', role: 'owner' },
        { handle: 'seed_chris', type: 'human', role: 'contributor' },
        { handle: 'seed_agent_builder', type: 'agent', role: 'contributor' },
      ],
      extraFiles: [
        { path: 'IDEAS.md', content: '# Ideas\n\n- (empty)\n' },
        { path: 'DEMO_PLAN.md', content: '# Demo plan\n\n- (empty)\n' },
      ],
      extraTasks: [
        { title: 'Pick 3 ideas to prototype', description: 'Shortlist ideas and decide which to pursue.', filePath: 'IDEAS.md' },
        { title: 'Draft demo flow', description: 'Define the click-path demo narrative.', filePath: 'DEMO_PLAN.md', actor: { handle: 'seed_agent_builder', type: 'agent' } },
      ],
      proposals: [
        {
          title: 'Seed demo plan skeleton',
          summary: 'Add headings for demo plan.',
          filePath: 'DEMO_PLAN.md',
          author: { handle: 'seed_agent_builder', type: 'agent' },
          flow: 'merge',
        },
        {
          title: 'Add idea scoring rubric',
          summary: 'Add a simple rubric to IDEAS.md.',
          filePath: 'IDEAS.md',
          author: { handle: 'seed_chris', type: 'human' },
          flow: 'needs_review',
        },
      ],
      decisions: ['Prototype speed > polish during hackathon.', 'Keep demo path under 3 minutes.'],
    },
    {
      slug: 'edu-knowledge-base',
      name: 'Education KB',
      summary: 'Education/knowledge base: lessons, examples, exercises.',
      visibility: 'open',
      template: 'general',
      owner: 'seed_dana',
      members: [
        { handle: 'seed_dana', type: 'human', role: 'owner' },
        { handle: 'seed_agent_research', type: 'agent', role: 'contributor' },
      ],
      extraFiles: [
        { path: 'LESSONS.md', content: '# Lessons\n\n- (empty)\n' },
        { path: 'EXERCISES.md', content: '# Exercises\n\n- (empty)\n' },
        { path: 'GLOSSARY.md', content: '# Glossary\n\n- (empty)\n' },
      ],
      extraTasks: [
        { title: 'Write 2 lessons', description: 'Short lessons with example + takeaway.', filePath: 'LESSONS.md' },
        { title: 'Add glossary entries', description: 'Seed 10 glossary terms.', filePath: 'GLOSSARY.md', actor: { handle: 'seed_agent_research', type: 'agent' } },
      ],
      proposals: [
        {
          title: 'Seed glossary skeleton',
          summary: 'Add initial glossary headings.',
          filePath: 'GLOSSARY.md',
          author: { handle: 'seed_agent_research', type: 'agent' },
          flow: 'merge',
        },
        {
          title: 'Draft first lesson outline',
          summary: 'Create lesson outline structure.',
          filePath: 'LESSONS.md',
          author: { handle: 'seed_dana', type: 'human' },
          flow: 'needs_review',
        },
      ],
      decisions: ['Keep lessons short; optimize for scanning.', 'Exercises should be executable in <15 minutes.'],
    },
    {
      slug: 'client-redacted',
      name: 'Client Project (Redacted)',
      summary: 'Client/restricted workspace: requirements, deliverables, approvals.',
      visibility: 'restricted',
      template: 'product',
      owner: 'seed_owner',
      members: [
        { handle: 'seed_owner', type: 'human', role: 'owner' },
        { handle: 'seed_alex', type: 'human', role: 'maintainer' },
        { handle: 'seed_agent_reviewer', type: 'agent', role: 'contributor' },
      ],
      extraFiles: [
        { path: 'REQUIREMENTS.md', content: '# Requirements\n\n- (empty)\n' },
        { path: 'DELIVERABLES.md', content: '# Deliverables\n\n- (empty)\n' },
      ],
      extraTasks: [
        { title: 'Clarify acceptance criteria', description: 'List acceptance criteria for v1 deliverable.', filePath: 'REQUIREMENTS.md' },
        { title: 'Prepare delivery checklist', description: 'Define delivery steps + review gates.', filePath: 'DELIVERABLES.md' },
      ],
      proposals: [
        {
          title: 'Add acceptance criteria section',
          summary: 'Seed acceptance criteria headings.',
          filePath: 'REQUIREMENTS.md',
          author: { handle: 'seed_agent_reviewer', type: 'agent' },
          flow: 'request_changes_loop',
        },
        {
          title: 'Draft delivery checklist',
          summary: 'Add initial delivery checklist items.',
          filePath: 'DELIVERABLES.md',
          author: { handle: 'seed_alex', type: 'human' },
          flow: 'needs_review',
        },
      ],
      decisions: ['Restricted: client-facing content requires maintainer review.', 'Prefer explicit acceptance criteria.'],
    },
    {
      slug: 'design-system',
      name: 'Design System & Docs',
      summary: 'Design system + docs: components, tokens, copy standards.',
      visibility: 'open',
      template: 'general',
      owner: 'seed_chris',
      members: [
        { handle: 'seed_chris', type: 'human', role: 'owner' },
        { handle: 'seed_agent_reviewer', type: 'agent', role: 'contributor' },
      ],
      extraFiles: [
        { path: 'TOKENS.md', content: '# Tokens\n\n- (empty)\n' },
        { path: 'COMPONENTS.md', content: '# Components\n\n- (empty)\n' },
        { path: 'COPY_GUIDE.md', content: '# Copy guide\n\n- (empty)\n' },
      ],
      extraTasks: [
        { title: 'Define button styles', description: 'Primary/secondary/destructive patterns.', filePath: 'COMPONENTS.md' },
        { title: 'Write copy guide rules', description: 'Tone, brevity, operational wording.', filePath: 'COPY_GUIDE.md', actor: { handle: 'seed_agent_reviewer', type: 'agent' } },
      ],
      proposals: [
        {
          title: 'Seed tokens table',
          summary: 'Add a minimal token list (colors/spacing).',
          filePath: 'TOKENS.md',
          author: { handle: 'seed_chris', type: 'human' },
          flow: 'merge',
        },
        {
          title: 'Draft copy rules',
          summary: 'Add short copy rules for operational UI.',
          filePath: 'COPY_GUIDE.md',
          author: { handle: 'seed_agent_reviewer', type: 'agent' },
          flow: 'needs_review',
        },
      ],
      decisions: ['Prefer consistent wording and predictable UI patterns.', 'Optimize for scanning on mobile.'],
    },
    {
      slug: 'consulting-notes',
      name: 'Consulting Notes',
      summary: 'Consulting/research workspace: client questions, notes, next steps.',
      visibility: 'restricted',
      template: 'research',
      owner: 'seed_alex',
      members: [
        { handle: 'seed_alex', type: 'human', role: 'owner' },
        { handle: 'seed_dana', type: 'human', role: 'contributor' },
        { handle: 'seed_agent_research', type: 'agent', role: 'contributor' },
      ],
      extraFiles: [
        { path: 'QUESTIONS.md', content: '# Questions\n\n- (empty)\n' },
        { path: 'NEXT_STEPS.md', content: '# Next steps\n\n- (empty)\n' },
      ],
      extraTasks: [
        { title: 'Collect open questions', description: 'Write top unanswered questions.', filePath: 'QUESTIONS.md' },
        { title: 'Draft next steps plan', description: 'Convert findings into next steps.', filePath: 'NEXT_STEPS.md', actor: { handle: 'seed_agent_research', type: 'agent' } },
      ],
      proposals: [
        {
          title: 'Seed question categories',
          summary: 'Add categories to QUESTIONS.md.',
          filePath: 'QUESTIONS.md',
          author: { handle: 'seed_dana', type: 'human' },
          flow: 'merge',
        },
        {
          title: 'Draft next steps',
          summary: 'Initial next steps outline.',
          filePath: 'NEXT_STEPS.md',
          author: { handle: 'seed_agent_research', type: 'agent' },
          flow: 'needs_review',
        },
      ],
      decisions: ['Restricted: client notes should not be public.', 'Decisions must be traceable to findings.'],
    },
    {
      slug: 'agent-lab',
      name: 'Agent Lab',
      summary: 'Agent-heavy experimental project: prompts, runs, eval notes.',
      visibility: 'open',
      template: 'product',
      owner: 'seed_owner',
      members: [
        { handle: 'seed_owner', type: 'human', role: 'owner' },
        { handle: 'seed_agent_builder', type: 'agent', role: 'contributor' },
        { handle: 'seed_agent_research', type: 'agent', role: 'contributor' },
      ],
      extraFiles: [
        { path: 'PROMPTS.md', content: '# Prompts\n\n- (empty)\n' },
        { path: 'RUN_LOG.md', content: '# Run log\n\n- (empty)\n' },
      ],
      extraTasks: [
        { title: 'Define eval rubric', description: 'What does "good agent output" mean?', filePath: 'SPEC.md' },
        { title: 'Log one agent run', description: 'Write a short run log entry.', filePath: 'RUN_LOG.md', actor: { handle: 'seed_agent_builder', type: 'agent' } },
      ],
      proposals: [
        {
          title: 'Seed prompts doc',
          summary: 'Add initial prompt structure.',
          filePath: 'PROMPTS.md',
          author: { handle: 'seed_agent_research', type: 'agent' },
          flow: 'merge',
        },
        {
          title: 'Draft eval rubric',
          summary: 'Add rubric headings in SPEC.md.',
          filePath: 'SPEC.md',
          author: { handle: 'seed_agent_builder', type: 'agent' },
          flow: 'needs_review',
        },
      ],
      decisions: ['Agents should propose small diffs for review.', 'Log runs with short, comparable summaries.'],
    },

    // --- Chinese scenario set (for richer pilot data) ---
    {
      slug: 'cn-product-build',
      name: '产品迭代 · 结算体验优化',
      summary: '产品研发项目:围绕结算流程优化、埋点与回归验证。',
      visibility: 'open',
      template: 'product',
      owner: 'seed_bella',
      members: [
        { handle: 'seed_bella', type: 'human', role: 'owner' },
        { handle: 'seed_alex', type: 'human', role: 'maintainer' },
      ],
      externalAgents: [
        { handle: 'oc_agent_checkout', displayName: '外部代理 · CheckoutBot', runtime: { capabilities: ['tasks', 'proposals', 'review'], note: '来自 OpenClaw 的外部代理示例' } },
      ],
      extraFiles: [
        { path: 'PRD.md', content: '# PRD\n\n## 背景\n结算转化率下滑,需要梳理关键摩擦点。\n\n## 目标\n- 降低支付失败率\n- 提升填写效率\n\n## 约束\n- 不改支付供应商\n' },
        { path: 'METRICS.md', content: '# 指标与埋点\n\n- 下单成功率\n- 支付失败分布\n- 表单完成耗时\n' },
      ],
      extraTasks: [
        { title: '梳理结算关键路径', description: '列出关键页面与字段,标注潜在摩擦点。', filePath: 'PRD.md' },
        { title: '补齐埋点定义', description: '在 METRICS.md 中补齐事件名、属性与采样策略。', filePath: 'METRICS.md', actor: { handle: 'seed_agent_ops', type: 'agent' } },
      ],
      proposals: [
        { title: 'PRD 增加非目标与风险', summary: '补充非目标/风险,避免范围蔓延。', filePath: 'PRD.md', author: { handle: 'oc_agent_checkout', type: 'agent' }, flow: 'request_changes_loop' },
        { title: '完善指标口径说明', summary: '把"成功率/失败率"口径写清楚。', filePath: 'METRICS.md', author: { handle: 'seed_alex', type: 'human' }, flow: 'needs_review' },
      ],
      decisions: ['优先保证关键路径稳定,再做微优化。', '所有改动必须可回滚并可度量。'],
    },
    {
      slug: 'cn-research-spec',
      name: '研究专项 · 竞品协作流程对比',
      summary: '研究/规格项目:对比 3 个协作产品的任务-提案-评审闭环。',
      visibility: 'open',
      template: 'research',
      owner: 'seed_dana',
      members: [
        { handle: 'seed_dana', type: 'human', role: 'owner' },
        { handle: 'seed_agent_research', type: 'agent', role: 'contributor' },
      ],
      extraFiles: [
        { path: '竞品清单.md', content: '# 竞品清单\n\n- A:看板 + PR\n- B:任务 + 评审\n- C:知识库 + 讨论\n' },
        { path: '观察记录.md', content: '# 观察记录\n\n## 入口\n- \n\n## 评审\n- \n' },
      ],
      extraTasks: [
        { title: '整理对比维度', description: '入口、权限、任务/提案、通知、搜索、移动端。', filePath: 'SPEC.md' },
        { title: '补齐观察记录', description: '把关键截图/步骤写进 观察记录.md。', filePath: '观察记录.md', actor: { handle: 'seed_agent_research', type: 'agent' } },
      ],
      proposals: [
        { title: 'SPEC 增加评估标准', summary: '把"好用"的标准写成可验证条目。', filePath: 'SPEC.md', author: { handle: 'seed_dana', type: 'human' }, flow: 'merge' },
        { title: '新增竞品入口小结', summary: '补充竞品入口体验小结。', filePath: '观察记录.md', author: { handle: 'seed_agent_research', type: 'agent' }, flow: 'needs_review' },
      ],
      decisions: ['研究输出必须落到一页可执行建议。', '避免"泛泛而谈",只记录可复现步骤。'],
    },
    {
      slug: 'cn-content-workflow',
      name: '内容工作流 · 教程系列制作',
      summary: '内容/创作项目:选题-大纲-初稿-审稿-发布清单。',
      visibility: 'open',
      template: 'general',
      owner: 'seed_chris',
      members: [
        { handle: 'seed_chris', type: 'human', role: 'owner' },
        { handle: 'seed_bella', type: 'human', role: 'contributor' },
      ],
      extraFiles: [
        { path: '选题池.md', content: '# 选题池\n\n- 入门:协作闭环是什么\n- 进阶:提案评审怎么做\n' },
        { path: '发布清单.md', content: '# 发布清单\n\n- 标题检查\n- 目录\n- 术语统一\n- 链接检查\n' },
      ],
      extraTasks: [
        { title: '写第一篇大纲', description: '把结构写清楚:背景→步骤→常见坑。', filePath: '选题池.md' },
        { title: '审阅发布清单', description: '删除冗余项,保留可执行检查。', filePath: '发布清单.md' },
      ],
      proposals: [
        { title: '发布清单加入"截图一致性"', summary: '补充截图与文案一致性检查。', filePath: '发布清单.md', author: { handle: 'seed_bella', type: 'human' }, flow: 'merge' },
        { title: '选题池增加"FAQ 结构"', summary: '给每篇文章预留 FAQ 段落。', filePath: '选题池.md', author: { handle: 'seed_chris', type: 'human' }, flow: 'needs_review' },
      ],
      decisions: ['内容评审优先看结构与可执行性。', '发布清单宁少勿多。'],
    },
    {
      slug: 'cn-community-restricted',
      name: '社群运营 · 事件处置(受限)',
      summary: '社群运营:投诉工单、处置流程、对外话术。',
      visibility: 'restricted',
      template: 'general',
      owner: 'seed_alex',
      members: [
        { handle: 'seed_alex', type: 'human', role: 'owner' },
        { handle: 'seed_agent_ops', type: 'agent', role: 'contributor' },
      ],
      extraFiles: [
        { path: '处置流程.md', content: '# 处置流程\n\n## 分级\n- P0:安全/合规\n- P1:高风险舆情\n- P2:一般投诉\n\n## 时限\n- P0:15 分钟内响应\n' },
        { path: '对外话术.md', content: '# 对外话术\n\n- 感谢反馈\n- 说明处理进度\n- 给出下一步时间点\n' },
      ],
      extraTasks: [
        { title: '补齐 P0 升级路径', description: '明确谁负责、怎么升级、何时关单。', filePath: '处置流程.md' },
        { title: '话术去模板化', description: '减少套话,提升信息密度。', filePath: '对外话术.md', actor: { handle: 'seed_agent_reviewer', type: 'agent' } },
      ],
      proposals: [
        { title: '处置流程增加"复盘模板"', summary: '补充复盘模板与记录字段。', filePath: '处置流程.md', author: { handle: 'seed_agent_ops', type: 'agent' }, flow: 'request_changes_loop' },
        { title: '对外话术补充"边界说明"', summary: '写清楚可承诺与不可承诺内容。', filePath: '对外话术.md', author: { handle: 'seed_alex', type: 'human' }, flow: 'needs_review' },
      ],
      decisions: ['受限项目:对外话术必须由负责人审核。', 'P0 事件先止血再优化。'],
    },
    {
      slug: 'cn-client-secure',
      name: '客户交付 · 需求与验收(受限)',
      summary: '客户项目:需求澄清、验收标准、里程碑与交付清单。',
      visibility: 'restricted',
      template: 'product',
      owner: 'seed_owner',
      members: [
        { handle: 'seed_owner', type: 'human', role: 'owner' },
        { handle: 'seed_bella', type: 'human', role: 'maintainer' },
      ],
      externalAgents: [
        { handle: 'oc_agent_client', displayName: '外部代理 · ClientOps', runtime: { capabilities: ['tasks', 'proposals'], note: '模拟外部交付代理' } },
      ],
      extraFiles: [
        { path: '需求澄清.md', content: '# 需求澄清\n\n## 现状\n\n## 目标\n\n## 不做什么\n' },
        { path: '验收标准.md', content: '# 验收标准\n\n- 功能点\n- 性能\n- 回归\n' },
        { path: '里程碑.md', content: '# 里程碑\n\n- M1\n- M2\n- M3\n' },
      ],
      extraTasks: [
        { title: '补齐验收标准细则', description: '把"可验证"写到每条验收标准里。', filePath: '验收标准.md' },
        { title: '梳理里程碑风险', description: '标注依赖与潜在延误点。', filePath: '里程碑.md' },
      ],
      proposals: [
        { title: '验收标准增加"回归范围"', summary: '补充回归范围与测试环境说明。', filePath: '验收标准.md', author: { handle: 'oc_agent_client', type: 'agent' }, flow: 'request_changes_loop' },
        { title: '需求澄清加入"非目标"', summary: '明确不做什么,减少扯皮。', filePath: '需求澄清.md', author: { handle: 'seed_bella', type: 'human' }, flow: 'needs_review' },
      ],
      decisions: ['受限项目:所有对外承诺必须可追溯到文件。', '验收标准优先写"怎么验证"。'],
    },
    {
      slug: 'cn-consulting-restricted',
      name: '咨询项目 · 访谈纪要(受限)',
      summary: '咨询/研究:访谈问题、纪要、结论与下一步建议。',
      visibility: 'restricted',
      template: 'research',
      owner: 'seed_dana',
      members: [
        { handle: 'seed_dana', type: 'human', role: 'owner' },
        { handle: 'seed_alex', type: 'human', role: 'contributor' },
      ],
      externalAgents: [
        { handle: 'oc_agent_notes', displayName: '外部代理 · NotesBot', runtime: { capabilities: ['tasks', 'proposals'], note: '访谈纪要整理代理' } },
      ],
      extraFiles: [
        { path: '访谈问题.md', content: '# 访谈问题\n\n- 现有流程最痛的点?\n- 现有协作方式的失败模式?\n' },
        { path: '访谈纪要.md', content: '# 访谈纪要\n\n## 受访者 A\n- \n' },
        { path: '结论与建议.md', content: '# 结论与建议\n\n- \n' },
      ],
      extraTasks: [
        { title: '整理纪要结构', description: '统一纪要结构:背景→关键语录→结论。', filePath: '访谈纪要.md', actor: { handle: 'oc_agent_notes', type: 'agent' } },
        { title: '输出 3 条可执行建议', description: '写成"动作 + 预期结果 + 验证方式"。', filePath: '结论与建议.md' },
      ],
      proposals: [
        { title: '纪要增加"关键语录"段', summary: '补充关键语录结构,方便复核。', filePath: '访谈纪要.md', author: { handle: 'oc_agent_notes', type: 'agent' }, flow: 'merge' },
        { title: '建议增加"验证方式"', summary: '每条建议补充验证方式。', filePath: '结论与建议.md', author: { handle: 'seed_dana', type: 'human' }, flow: 'needs_review' },
      ],
      decisions: ['受限项目:访谈内容不可外泄。', '建议必须可验证、可执行。'],
    },
    {
      slug: 'cn-ops-proc',
      name: '内部流程 · 发布与回滚(受限)',
      summary: '内部流程项目:发布流程、回滚、值班交接与事故复盘。',
      visibility: 'restricted',
      template: 'general',
      owner: 'seed_alex',
      members: [
        { handle: 'seed_alex', type: 'human', role: 'owner' },
        { handle: 'seed_agent_ops', type: 'agent', role: 'contributor' },
      ],
      extraFiles: [
        { path: '发布流程.md', content: '# 发布流程\n\n1) 预检\n2) 灰度\n3) 扩量\n4) 观察\n' },
        { path: '回滚预案.md', content: '# 回滚预案\n\n- 触发条件\n- 回滚步骤\n- 风险提示\n' },
        { path: '事故复盘.md', content: '# 事故复盘\n\n## 时间线\n\n## 根因\n\n## 行动项\n' },
      ],
      extraTasks: [
        { title: '补齐回滚触发条件', description: '把触发条件写成可观测指标阈值。', filePath: '回滚预案.md' },
        { title: '完善值班交接清单', description: '交接必须包含监控/报警/进行中变更。', filePath: '发布流程.md', actor: { handle: 'seed_agent_ops', type: 'agent' } },
      ],
      proposals: [
        { title: '回滚预案补充"沟通模板"', summary: '加入对内/对外沟通模板。', filePath: '回滚预案.md', author: { handle: 'seed_agent_ops', type: 'agent' }, flow: 'merge' },
        { title: '事故复盘增加"预防措施"', summary: '明确预防措施与负责人。', filePath: '事故复盘.md', author: { handle: 'seed_alex', type: 'human' }, flow: 'needs_review' },
      ],
      decisions: ['受限项目:发布与回滚流程必须统一版本。', '所有事故复盘必须产出行动项。'],
    },
    {
      slug: 'cn-agent-heavy',
      name: '代理实验室 · 多代理协作实验',
      summary: '代理密集项目:多代理分工(写作/审阅/研究/运维)与合并策略。',
      visibility: 'open',
      template: 'product',
      owner: 'seed_owner',
      members: [
        { handle: 'seed_owner', type: 'human', role: 'owner' },
        { handle: 'seed_agent_builder', type: 'agent', role: 'contributor' },
        { handle: 'seed_agent_reviewer', type: 'agent', role: 'contributor' },
      ],
      externalAgents: [
        { handle: 'oc_agent_lab', displayName: '外部代理 · LabBot', runtime: { capabilities: ['tasks', 'proposals', 'review'], note: '外部代理参与示例' } },
      ],
      extraFiles: [
        { path: '实验设计.md', content: '# 实验设计\n\n- 目标\n- 方法\n- 指标\n- 风险\n' },
        { path: '运行记录.md', content: '# 运行记录\n\n- (empty)\n' },
      ],
      extraTasks: [
        { title: '定义分工边界', description: '明确每个代理负责什么、不负责什么。', filePath: '实验设计.md' },
        { title: '记录一次协作运行', description: '把输入/输出/复盘写入运行记录。', filePath: '运行记录.md', actor: { handle: 'oc_agent_lab', type: 'agent' } },
      ],
      proposals: [
        { title: '实验设计补充"失败模式"', summary: '列出最可能失败的 3 种模式及应对。', filePath: '实验设计.md', author: { handle: 'oc_agent_lab', type: 'agent' }, flow: 'merge' },
        { title: '运行记录增加模板', summary: '加入运行记录模板字段。', filePath: '运行记录.md', author: { handle: 'seed_agent_reviewer', type: 'agent' }, flow: 'needs_review' },
      ],
      decisions: ['多代理协作优先保证可追溯。', '合并前必须明确"谁负责最终决策"。'],
    },
  ];

  for (const s of scenarios) {
    let p = getProjectBySlug(s.slug);
    if (!p) {
      createProject({
        name: s.name,
        slug: s.slug,
        summary: s.summary,
        visibility: s.visibility,
        actorHandle: s.owner,
        actorType: 'human',
        template: s.template,
      });
      p = getProjectBySlug(s.slug);
    }
    if (!p) continue;

    // Ensure members.
    for (const m of s.members) {
      ensureIdentity(m.handle, m.type);
      db.prepare('INSERT OR IGNORE INTO project_members (project_id, member_handle, member_type, role, joined_at) VALUES (?, ?, ?, ?, ?)').run(
        p.id,
        m.handle,
        m.type,
        m.role,
        now
      );
    }

    // External/OpenClaw-style agent participation (origin=openclaw + binding token + runtime).
    if (s.externalAgents && s.externalAgents.length) {
      for (const ea of s.externalAgents) {
        try {
          externalAgentIntake({
            agentHandle: ea.handle,
            displayName: ea.displayName,
            projectSlug: s.slug,
            runtime: ea.runtime || { capabilities: ['tasks', 'proposals', 'review'] },
          });
        } catch {
          // best-effort
        }
      }
    }

    // Decisions: append to DECISIONS.md if still empty.
    const dec = db.prepare('SELECT content FROM project_files WHERE project_id=? AND path=?').get(p.id, 'DECISIONS.md') as { content: string } | undefined;
    if (dec && dec.content.includes('(empty)') && s.decisions.length) {
      const body = ['# Decisions', '', ...s.decisions.map((d) => `- ${d}`), ''].join('\n');
      db.prepare(
        'UPDATE project_files SET content=?, updated_at=?, last_actor_handle=?, last_actor_type=?, last_proposal_id=? WHERE project_id=? AND path=?'
      ).run(body, now, s.owner, 'human', null, p.id, 'DECISIONS.md');
    }

    // Extra files.
    const insFile = db.prepare(
      'INSERT OR IGNORE INTO project_files (project_id, path, content, updated_at, last_actor_handle, last_actor_type, last_proposal_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const f of s.extraFiles) {
      insFile.run(p.id, f.path, f.content.endsWith('\n') ? f.content : f.content + '\n', now, s.owner, 'human', null);
    }

    // Extra tasks.
    const existingTitles = new Set(
      (db.prepare('SELECT title FROM tasks WHERE project_id=?').all(p.id) as Array<{ title: string }>).map((r) => r.title)
    );
    for (const t of s.extraTasks) {
      if (existingTitles.has(t.title)) continue;
      createTask({
        projectSlug: s.slug,
        title: t.title,
        description: t.description,
        filePath: t.filePath ?? null,
        actorHandle: t.actor?.handle || s.owner,
        actorType: t.actor?.type || 'human',
      });
    }

    // Proposals (by title).
    const existingProposalTitles = new Set(
      (db.prepare('SELECT title FROM proposals WHERE project_id=?').all(p.id) as Array<{ title: string }>).map((r) => r.title)
    );

    for (const pr of s.proposals) {
      if (existingProposalTitles.has(pr.title)) continue;
      const created = createProposal({
        projectSlug: s.slug,
        title: pr.title,
        summary: pr.summary,
        authorHandle: pr.author.handle,
        authorType: pr.author.type,
        filePath: pr.filePath,
        newContent: `# ${s.name}\n\n(${pr.summary})\n`,
        taskId: null,
      });
      if (!created) continue;

      if (pr.flow === 'needs_review') {
        // Leave as needs_review.
        continue;
      }

      if (pr.flow === 'merge') {
        proposalAction({ id: created.id, action: 'approve', actorHandle: s.owner, actorType: 'human' });
        proposalAction({ id: created.id, action: 'merge', actorHandle: s.owner, actorType: 'human' });
        continue;
      }

      if (pr.flow === 'request_changes_loop') {
        proposalAction({ id: created.id, action: 'request_changes', actorHandle: s.owner, actorType: 'human', note: 'Please tighten acceptance criteria.' });
        // Update + re-approve + merge.
        updateProposal({
          id: created.id,
          actorHandle: pr.author.handle,
          actorType: pr.author.type,
          newContent: `# ${s.name}\n\n(Updated) ${pr.summary}\n\n- Acceptance criteria: explicit, testable\n`,
          summary: pr.summary + ' (updated)',
          note: 'Updated per request changes.',
        });
        proposalAction({ id: created.id, action: 'approve', actorHandle: s.owner, actorType: 'human' });
        proposalAction({ id: created.id, action: 'merge', actorHandle: s.owner, actorType: 'human' });
      }
    }
  }
}

function ensurePhase43Enrichment() {
  const db = getDb();
  const now = nowIso();

  // One-time marker (idempotent).
  db.exec(
    `CREATE TABLE IF NOT EXISTS seed_markers (
      key TEXT PRIMARY KEY,
      value TEXT,
      created_at TEXT NOT NULL
    );`
  );
  const done = db.prepare('SELECT value FROM seed_markers WHERE key=?').get('phase43') as { value: string } | undefined;
  if (done?.value === 'done') return;

  const projects = db.prepare('SELECT id, slug, name, summary, visibility FROM projects ORDER BY created_at ASC').all() as Array<{
    id: number;
    slug: string;
    name: string;
    summary: string;
    visibility: string;
  }>;

  // Uneven density tiers (required).
  const overloaded = new Set<string>([
    'a2a-site',
    'product-alpha',
    'agent-lab',
    'community-ops',
    'cn-product-build',
    'cn-client-secure',
    'cn-community-restricted',
    'cn-agent-heavy',
  ]);
  const early = new Set<string>(['demo']);
  const tierOf = (slug: string) => (early.has(slug) ? 'early' : overloaded.has(slug) ? 'overloaded' : slug.startsWith('cn-') ? 'medium' : 'light');

  // Ensure helper: insert file if missing.
  const ensureProjectFile = (pid: number, path: string, content: string, actorHandle = 'seed_owner', actorType: MemberType = 'human') => {
    db.prepare(
      `INSERT INTO project_files (project_id, path, content, updated_at, last_actor_handle, last_actor_type, last_proposal_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(project_id, path) DO NOTHING`
    ).run(pid, path, content.endsWith('\n') ? content : content + '\n', now, actorHandle, actorType, null);
  };

  const ensureDecisionBullets = (pid: number, bullets: string[]) => {
    const r = db.prepare('SELECT content FROM project_files WHERE project_id=? AND path=?').get(pid, 'DECISIONS.md') as { content: string } | undefined;
    if (!r) return;
    const existing = r.content.split('\n').filter((l) => l.trim().startsWith('- '));
    const need = bullets.filter((b) => !existing.some((l) => l.includes(b)));
    if (!need.length) return;
    const next = r.content.replace(/\n?$/g, '') + '\n' + need.map((b) => `- ${b}`).join('\n') + '\n';
    db.prepare(
      'UPDATE project_files SET content=?, updated_at=?, last_actor_handle=?, last_actor_type=?, last_proposal_id=? WHERE project_id=? AND path=?'
    ).run(next, now, 'seed_owner', 'human', null, pid, 'DECISIONS.md');
  };

  const upsertRuntime = (handle: string, runtime: Record<string, unknown>, lastSeenIso: string) => {
    ensureIdentity(handle, 'agent');
    db.prepare(
      `INSERT INTO agent_runtime (agent_handle, runtime_json, last_seen)
       VALUES (?, ?, ?)
       ON CONFLICT(agent_handle) DO UPDATE SET runtime_json=excluded.runtime_json, last_seen=excluded.last_seen`
    ).run(handle, JSON.stringify(runtime || {}), lastSeenIso);
  };

  const humanPool = ['seed_owner', 'seed_alex', 'seed_bella', 'seed_chris', 'seed_dana'];
  const agentPool = ['seed_agent_builder', 'seed_agent_reviewer', 'seed_agent_research', 'seed_agent_ops', 'oc_agent_checkout', 'oc_agent_client', 'oc_agent_notes', 'oc_agent_lab'];

  for (const p of projects) {
    const tier = tierOf(p.slug);
    const isCn = p.slug.startsWith('cn-');

    // Members: uneven targets.
    const targetMembers = tier === 'overloaded' ? 5 : tier === 'medium' ? 4 : tier === 'light' ? 3 : 2;
    const current = db.prepare('SELECT member_handle, member_type, role FROM project_members WHERE project_id=?').all(p.id) as Array<{
      member_handle: string;
      member_type: string;
      role: string;
    }>;
    const memberKey = new Set(current.map((m) => `${m.member_handle}:${m.member_type}`));
    const addMember = (handle: string, type: MemberType, role: MemberRole) => {
      if (memberKey.has(`${handle}:${type}`)) return;
      ensureIdentity(handle, type);
      db.prepare('INSERT OR IGNORE INTO project_members (project_id, member_handle, member_type, role, joined_at) VALUES (?, ?, ?, ?, ?)').run(
        p.id,
        handle,
        type,
        role,
        now
      );
      db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(p.id, now, `Member added: @${handle} (${type}) as ${role}`);
      memberKey.add(`${handle}:${type}`);
    };

    if (!current.some((m) => m.role === 'owner')) addMember('seed_owner', 'human', 'owner');
    for (const h of humanPool) {
      if (memberKey.size >= targetMembers) break;
      addMember(h, 'human', h === 'seed_owner' ? 'owner' : 'contributor');
    }
    if (tier !== 'early') {
      for (const a of agentPool) {
        if (memberKey.size >= targetMembers) break;
        addMember(a, 'agent', 'contributor');
      }
    }

    // Files: uneven targets.
    const fileTarget = tier === 'overloaded' ? 15 : tier === 'medium' ? 12 : tier === 'light' ? 9 : 6;
    const existingPaths = new Set(
      (db.prepare('SELECT path FROM project_files WHERE project_id=?').all(p.id) as Array<{ path: string }>).map((r) => r.path)
    );
    const fileSeedsZh = [
      { path: '周报.md', content: '# 周报\n\n## 本周进展\n- \n\n## 下周计划\n- \n' },
      { path: '风险清单.md', content: '# 风险清单\n\n- \n' },
      { path: '会议纪要.md', content: '# 会议纪要\n\n- \n' },
      { path: '对外口径.md', content: '# 对外口径\n\n- 现状\n- 下一步\n- 预计时间\n' },
      { path: '复盘.md', content: '# 复盘\n\n## 现象\n\n## 根因\n\n## 行动项\n' },
    ];
    const fileSeedsEn = [
      { path: 'NOTES.md', content: '# Notes\n\n- Key updates\n- Open questions\n' },
      { path: 'RISKS.md', content: '# Risks\n\n- (empty)\n' },
      { path: 'STATUS.md', content: '# Status\n\n- Now\n- Next\n- Blockers\n' },
      { path: 'RUNBOOK.md', content: '# Runbook\n\n- (empty)\n' },
      { path: 'RETRO.md', content: '# Retro\n\n- (empty)\n' },
    ];
    const seeds = isCn ? fileSeedsZh : fileSeedsEn;
    for (const f of seeds) {
      if (existingPaths.size >= fileTarget) break;
      if (existingPaths.has(f.path)) continue;
      ensureProjectFile(p.id, f.path, f.content);
      existingPaths.add(f.path);
      db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(p.id, now, `File added: ${f.path} (enrich)`);
    }
    for (let i = 1; existingPaths.size < fileTarget; i++) {
      const pp = isCn ? `docs/说明-${String(i).padStart(2, '0')}.md` : `docs/note-${String(i).padStart(2, '0')}.md`;
      if (existingPaths.has(pp)) continue;
      const content = isCn
        ? `# 说明 ${i}\n\n- 背景:${p.name}\n- 目标:${p.summary}\n- 备注:按需补充\n`
        : `# Note ${i}\n\n- Context: ${p.name}\n- Goal: ${p.summary}\n- Notes: add details as needed\n`;
      ensureProjectFile(p.id, pp, content);
      existingPaths.add(pp);
      db.prepare('INSERT INTO activity (project_id, ts, text) VALUES (?, ?, ?)').run(p.id, now, `File added: ${pp} (enrich)`);
    }

    // Decisions: uneven targets.
    const decisionTarget = tier === 'overloaded' ? 5 : tier === 'medium' ? 4 : tier === 'light' ? 3 : 2;
    const decisions = isCn
      ? ['先把关键路径跑通,再做体验细节。', '提案优先小改动(单文件)。', '所有关键改动必须可回滚。', '通知要"可行动"。', '移动端优先保证可读与可点击。']
      : ['Prefer small, reviewable proposals.', 'Keep operational wording consistent.', 'Make changes measurable.', 'Notifications should be actionable.', 'Mobile readability is first-class.'];
    ensureDecisionBullets(p.id, decisions.slice(0, decisionTarget));

    // Tasks: uneven targets + mixed states.
    const taskTarget = tier === 'overloaded' ? 12 : tier === 'medium' ? 10 : tier === 'light' ? 8 : 4;
    const tasks = db.prepare('SELECT id, title FROM tasks WHERE project_id=?').all(p.id) as Array<{ id: string; title: string }>;
    const titles = new Set(tasks.map((t) => t.title));
    const seedTasksZh = ['梳理当前问题清单', '补齐文档目录结构', '做一次端到端回归', '整理通知规则'];
    const seedTasksEn = ['Triage open questions', 'Improve workspace structure', 'Run an end-to-end check', 'Clarify notification rules'];
    const baseTasks = isCn ? seedTasksZh : seedTasksEn;
    for (const t of baseTasks) {
      if (titles.size >= taskTarget) break;
      const tt = `${tier === 'overloaded' ? 'E43' : 'E43-lite'}: ${t}`;
      if (titles.has(tt)) continue;
      const created = createTask({
        projectSlug: p.slug,
        title: tt,
        description: isCn ? '用于增加真实密度与状态混合。' : 'Used to increase realistic density and state mix.',
        filePath: 'README.md',
        actorHandle: 'seed_owner',
        actorType: 'human',
      });
      titles.add(tt);
      const idx = titles.size;
      if (idx % 4 === 0) taskAction({ taskId: created.id, action: 'claim', actorHandle: 'seed_agent_builder', actorType: 'agent' });
      if (idx % 4 === 1) taskAction({ taskId: created.id, action: 'start', actorHandle: 'seed_agent_builder', actorType: 'agent' });
      if (idx % 4 === 2) {
        taskAction({ taskId: created.id, action: 'start', actorHandle: 'seed_owner', actorType: 'human' });
        taskAction({ taskId: created.id, action: 'complete', actorHandle: 'seed_owner', actorType: 'human' });
      }
    }
    for (let i = 1; titles.size < taskTarget; i++) {
      const tt = isCn ? `E43: 额外任务 ${i}` : `E43: Extra task ${i}`;
      if (titles.has(tt)) continue;
      createTask({
        projectSlug: p.slug,
        title: tt,
        description: isCn ? '用于制造真实密度与状态分布。' : 'Used to create realistic density and state mix.',
        filePath: null,
        actorHandle: 'seed_owner',
        actorType: 'human',
      });
      titles.add(tt);
    }

    // Proposals: uneven targets + mixed statuses + multiple request-changes loops.
    const proposalTarget = tier === 'overloaded' ? 8 : tier === 'medium' ? 6 : tier === 'light' ? 4 : 2;
    const proposalTitles = new Set(
      (db.prepare('SELECT title FROM proposals WHERE project_id=?').all(p.id) as Array<{ title: string }>).map((r) => r.title)
    );
    const baseTitle = isCn ? 'E43 提案' : 'E43 Proposal';
    for (let i = 1; proposalTitles.size < proposalTarget; i++) {
      const title = `${baseTitle} ${i}`;
      if (proposalTitles.has(title)) continue;
      const author = i % 2 === 0 ? { handle: 'seed_owner', type: 'human' as const } : { handle: 'seed_agent_reviewer', type: 'agent' as const };
      const fp = isCn ? '周报.md' : 'NOTES.md';
      const pr = createProposal({
        projectSlug: p.slug,
        title,
        summary: isCn ? '用于制造评审/合并/拒绝等混合状态。' : 'Used to generate mixed review/merge/reject states.',
        authorHandle: author.handle,
        authorType: author.type,
        filePath: fp,
        newContent: isCn
          ? `# ${p.name}\n\n## 更新\n- 提案 ${i}\n\n## 备注\n- ${p.summary}\n`
          : `# ${p.name}\n\n## Update\n- Proposal ${i}\n\n## Notes\n- ${p.summary}\n`,
        taskId: null,
      });
      if (!pr) continue;
      proposalTitles.add(title);

      if (i % 5 === 0) {
        proposalAction({ id: pr.id, action: 'reject', actorHandle: 'seed_owner', actorType: 'human' });
      } else if (i % 5 === 1) {
        proposalAction({ id: pr.id, action: 'request_changes', actorHandle: 'seed_owner', actorType: 'human', note: isCn ? '请补充可验证标准。' : 'Please add verifiable criteria.' });
        updateProposal({
          id: pr.id,
          actorHandle: author.handle,
          actorType: author.type,
          summary: (isCn ? '已按要求补充' : 'Updated per request') + ` (${i})`,
          newContent: isCn
            ? `# ${p.name}\n\n- 提案 ${i}\n- 已补充:可验证标准\n`
            : `# ${p.name}\n\n- Proposal ${i}\n- Added: verifiable criteria\n`,
          note: isCn ? '根据 request changes 更新。' : 'Updated per request changes.',
        });
        proposalAction({ id: pr.id, action: 'approve', actorHandle: 'seed_owner', actorType: 'human' });
        proposalAction({ id: pr.id, action: 'merge', actorHandle: 'seed_owner', actorType: 'human' });
      } else if (i % 5 === 2) {
        proposalAction({ id: pr.id, action: 'approve', actorHandle: 'seed_owner', actorType: 'human' });
      } else if (i % 5 === 3) {
        // leave needs_review
      } else {
        proposalAction({ id: pr.id, action: 'approve', actorHandle: 'seed_owner', actorType: 'human' });
        proposalAction({ id: pr.id, action: 'merge', actorHandle: 'seed_owner', actorType: 'human' });
      }
    }

    // Invites: pending/accepted/revoked for restricted.
    if ((p.visibility === 'restricted' ? 'restricted' : 'open') === 'restricted') {
      const invCount = (db.prepare('SELECT COUNT(*) as c FROM invitations WHERE project_id=?').get(p.id) as { c: number }).c;
      const invTarget = tier === 'overloaded' ? 6 : 3;
      if (invCount < invTarget) {
        const invTargets = [
          { h: 'seed_chris', t: 'human' as const, role: 'contributor' as const },
          { h: 'seed_agent_ops', t: 'agent' as const, role: 'contributor' as const },
          { h: 'seed_dana', t: 'human' as const, role: 'maintainer' as const },
        ];
        for (const it of invTargets) {
          try {
            createInvitation({ projectSlug: p.slug, inviteeHandle: it.h, inviteeType: it.t, role: it.role, actorHandle: 'seed_owner', actorType: 'human' });
          } catch {}
        }
        const invRow = db.prepare("SELECT id FROM invitations WHERE project_id=? AND status='pending' ORDER BY created_at ASC LIMIT 1").get(p.id) as
          | { id: string }
          | undefined;
        if (invRow) {
          try { invitationAction({ id: invRow.id, action: 'revoke', actorHandle: 'seed_owner' }); } catch {}
        }
      }
    }

    // Agent runtime: active + stale.
    if (tier !== 'early') {
      const staleTs = new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString();
      upsertRuntime('seed_agent_builder', { capabilities: ['tasks', 'proposals', 'review'], project: p.slug }, now);
      upsertRuntime('seed_agent_research', { capabilities: ['research', 'notes'], project: p.slug }, staleTs);
    }

    // Notifications: global top-up (organic-ish).
    if (unreadNotificationCount('seed_owner') < 120) {
      notifyHuman('seed_owner', 'seed.info', isCn ? `项目更新:/${p.slug}(用于密度测试)` : `Update: /${p.slug} (density seed)`, `/projects/${p.slug}`);
    }
  }

  db.prepare('INSERT OR REPLACE INTO seed_markers (key, value, created_at) VALUES (?, ?, ?)').run('phase43', 'done', now);
}


// Intent marker read helper (soft coordination signals).
// Reads recent audit_events of kind='intent.marker' for a given target.
export function listRecentIntentMarkersForTarget(args: { targetType: string; targetId: string; limit?: number }) {
  const db = getDb();
  const limit = Math.max(1, Math.min(20, args.limit || 5));

  // Minimal, deterministic filter: match both targetType and targetId substrings in payload_json.
  const like = `%"targetType":"${String(args.targetType)}"%"targetId":"${String(args.targetId)}"%`;
  const rows = db
    .prepare('SELECT ts, payload_json FROM audit_events WHERE kind=? AND payload_json LIKE ? ORDER BY ts DESC LIMIT ?')
    .all('intent.marker', like, limit) as Array<{ ts: string; payload_json: string }>;

  const out: any[] = [];
  for (const r of rows) {
    try {
      const p = JSON.parse(r.payload_json || '{}');
      out.push({
        ts: String(p.ts || r.ts || ''),
        actorHandle: String(p.actorHandle || ''),
        actorType: p.actorType === 'agent' ? 'agent' : p.actorType === 'human' ? 'human' : null,
        targetType: String(p.targetType || ''),
        targetId: String(p.targetId || ''),
        intent: String(p.intent || ''),
        note: p.note ? String(p.note) : null,
      });
    } catch {}
  }
  return out;
}
