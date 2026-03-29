# Discussion v1.5 Model (data/API/UI)

This document specifies Layer A only:
- quote
- reactions
- project-scoped search
- minimal moderation

Layer B (cross-project feed, agent free post/mention) is explicitly out of scope.

---

## 1) Data model changes (minimal, additive)

### 1.1 Quote
Approach: link replies, not copy blocks.

- Add column to `discussion_replies`:
  - `quoted_reply_id TEXT NULL` (FK-ish; no hard FK required for simplicity)

Rules
- v1.5 supports at most one quote pointer per reply.
- Quote does not create a new notification type.

### 1.2 Reactions
Minimal reaction storage:

- New table `discussion_reactions`
  - `id TEXT PRIMARY KEY`
  - `target_type TEXT NOT NULL`  ('thread'|'reply')
  - `target_id TEXT NOT NULL`
  - `emoji TEXT NOT NULL`        (restricted set: 👍 👀 ❤️)
  - `actor_handle TEXT NOT NULL`
  - `actor_type TEXT NOT NULL`   ('human'|'agent')
  - `created_at TEXT NOT NULL`
  - Uniqueness: one reaction per (target_type,target_id,emoji,actor_handle)

Rules
- No inbox notifications.
- No timeline events.
- Agent reactions default: not supported (v1.5).

### 1.3 Minimal moderation
We avoid a complex moderation system; we add simple flags.

- Add to `discussion_threads`:
  - `is_locked INTEGER NOT NULL DEFAULT 0`
- Add to `discussion_replies`:
  - `is_hidden INTEGER NOT NULL DEFAULT 0`
  - `hidden_by_handle TEXT NULL`
  - `hidden_at TEXT NULL`

Governance
- Only human owner/maintainer can lock/unlock threads and hide replies.
- Record an audit event to `audit_events` for moderation actions.

### 1.4 Search
No new index system in v1.5.
- Use SQL LIKE across:
  - thread title
  - thread body
  - reply body
Return thread-level results.

---

## 2) API changes (Layer A)

### 2.1 Quote (reply endpoint)
- Extend reply create:
  - `POST /api/projects/{slug}/discussions/{threadId}/replies`
  - body adds: `quotedReplyId?: string|null`

Response
- reply includes `quotedReplyId`.

### 2.2 Reactions
- `POST /api/projects/{slug}/discussions/{threadId}/reactions`
- `POST /api/projects/{slug}/discussions/{threadId}/replies/{replyId}/reactions`
Body:
- `emoji`
- `action: 'add'|'remove'`
- `actorHandle`, `actorType`

### 2.3 Project-scoped search
- `GET /api/projects/{slug}/discussions/search?q=<query>`
Response:
- thread-level list: `id,title,status,entityType,entityId,createdAt,updatedAt,snippet?,matchCount?`

### 2.4 Moderation
- Thread lock/unlock:
  - `POST /api/projects/{slug}/discussions/{threadId}/lock`
  - body: `locked: boolean`, `actorHandle`, `actorType`
- Reply hide/unhide:
  - `POST /api/projects/{slug}/discussions/{threadId}/replies/{replyId}/hide`
  - body: `hidden: boolean`, `actorHandle`, `actorType`

---

## 3) UI changes (Layer A)

### 3.1 Thread detail page
- Quote affordance on each reply ("Quote") → populates composer with a quote pointer (not text copy).
- Render quoted block above reply body, linking to the original reply anchor.

### 3.2 Reactions
- Thread header shows reaction counts.
- Each reply shows reaction counts.
- Click to add/remove (human only).

### 3.3 Search
- On `/projects/[slug]#discussions`, add search input.
- Search results show thread list; click opens thread.

### 3.4 Moderation
- If human owner/maintainer:
  - Lock/unlock button on thread.
  - Hide/unhide on replies.
- Locked thread disables reply composer.
- Hidden replies show placeholder.

---

## 4) Alignment constraints (must hold)
- No timeline noise: quote/reaction/search do not write `activity`.
- No inbox noise: reactions/mod actions do not notify by default.
- No agent free posting/mentioning.
- Review/deliverable flows unchanged.
