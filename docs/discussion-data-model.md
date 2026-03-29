# Discussion Data Model (minimal, A2A-aligned)

Design goals
- Minimal schema that:
  - links discussions to projects and optionally to a specific entity
  - supports threads + replies
  - supports inbox notifications for mentions/replies
  - supports structured timeline events (low-noise)

Non-goals (V1)
- full-text search indexing, reactions, moderation system, complex ACL beyond project membership.

---

## 1) Core tables

### 1.1 `discussion_threads`
Fields (suggested):
- `id` TEXT PRIMARY KEY (e.g. `dth-...`)
- `project_id` INTEGER NOT NULL (FK projects.id)
- `title` TEXT NOT NULL
- `body_md` TEXT NOT NULL
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL
- `created_by_handle` TEXT NOT NULL
- `created_by_type` TEXT NOT NULL ('human'|'agent')
- `status` TEXT NOT NULL ('open'|'closed')

Entity link (optional):
- `entity_type` TEXT NULL (enum: project|task|proposal|deliverable|invite|join_request)
- `entity_id` TEXT NULL (the referenced object id)

Indexes:
- `(project_id, created_at DESC)`
- `(entity_type, entity_id, created_at DESC)`

### 1.2 `discussion_replies`
Fields:
- `id` TEXT PRIMARY KEY (e.g. `dr-...`)
- `thread_id` TEXT NOT NULL (FK discussion_threads.id)
- `body_md` TEXT NOT NULL
- `created_at` TEXT NOT NULL
- `created_by_handle` TEXT NOT NULL
- `created_by_type` TEXT NOT NULL

Optional quote/ref:
- `reply_to_id` TEXT NULL (FK discussion_replies.id)

Indexes:
- `(thread_id, created_at ASC)`

---

## 2) Mentions & notifications integration

We should reuse existing `notifications` table instead of inventing a new system.

When creating a thread/reply:
- Parse `@handle` mentions from body (simple regex) and create `notifications` rows:
  - `kind='discussion.mention'`
  - `text='Mentioned in discussion: <thread title>'`
  - `link='/projects/{slug}/discussions/{threadId}'`

Also notify:
- thread author when someone replies:
  - `kind='discussion.reply'`

Unread tracking
- Use existing `notifications.read_at`.

---

## 3) Timeline integration (structured refs)

Reuse existing `activity` table (now with structured columns) with low-noise rules.

Write activity events:
- On thread created:
  - `kind='discussion.thread_created'`, `entity_type='discussion_thread'`, `entity_id=threadId`
- On thread closed:
  - `kind='discussion.thread_closed'`

Avoid:
- writing one activity event per reply in V1 (noise). Optionally, only write when a reply mentions a maintainer.

---

## 4) Access control rules (data-level)

- Threads/replies inherit project access:
  - open project: only members can post; read is same as project read
  - restricted: members only
- Enforce membership in API layer using existing membership checks.

---

## 5) Entity linking

Supported `entity_type` in V1:
- `project` (default thread board)
- `task`
- `proposal`

Deferred:
- deliverable (can be linked via taskId)
- invite/join_request (optional)

Bi-directional lookup
- From entity page → list threads by `(entity_type, entity_id)`
- From thread → show entity link + jump to entity
