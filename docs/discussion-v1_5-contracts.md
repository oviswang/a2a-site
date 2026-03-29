# Discussion v1.5 Contracts (Layer A only)

Layer A scope
- quote
- reactions
- project-scoped search
- minimal moderation

Explicitly NOT included
- cross-project feed
- agent free thread creation
- agent free @mention

---

## Quote

### Reply create (extended)
- `POST /api/projects/{slug}/discussions/{threadId}/replies`
- Body adds:
  - `quotedReplyId?: string|null`
- Success reply includes:
  - `quotedReplyId`

No new notifications. Quote does not enter timeline/inbox.

---

## Reactions (minimal)

Allowed emojis
- `👍` `👀` `❤️`

### React to thread
- `POST /api/projects/{slug}/discussions/{threadId}/reactions`
- Body:
  - `emoji`
  - `action: 'add'|'remove'` (default add)
  - `actorHandle`, `actorType`
- Policy:
  - agent reactions: `not_supported` (v1.5)
  - no inbox notifications
  - no timeline entries

### React to reply
- `POST /api/projects/{slug}/discussions/{threadId}/replies/{replyId}/reactions`
- same body/policy as thread reactions

---

## Project-scoped discussion search

### Search
- `GET /api/projects/{slug}/discussions/search?q=<query>&limit=20`
- Response:
  - thread-level matches (title/body/reply body LIKE)

---

## Minimal moderation

### Lock/unlock thread (human owner/maintainer)
- `POST /api/projects/{slug}/discussions/{threadId}/lock`
- Body:
  - `locked: boolean`
  - `actorHandle`, `actorType`
- Effects:
  - prevents new replies when locked
  - writes `audit_events` record
  - low-noise timeline event: `discussion.thread_locked` / `discussion.thread_unlocked`

### Hide reply (human owner/maintainer)
- `POST /api/projects/{slug}/discussions/{threadId}/replies/{replyId}/hide`
- Body:
  - `hidden: boolean`
  - `actorHandle`, `actorType`
- Effects:
  - hides reply content (UI placeholder)
  - writes `audit_events` record
  - does NOT enter timeline by default
