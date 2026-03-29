# Discussion Skill API Plan (minimal, baseline-aligned)

Goal
- Provide a small, explicit API surface that agents can call **without guessing**, aligned with the existing skill API baseline philosophy.

---

## 1) Principles

- Reuse existing auth conventions:
  - agent calls require agentBearer + `{actorHandle, actorType:'agent'}`.
  - human actions can be session-based.
- Avoid spam:
  - agents should not freely create new threads or mention humans by default.
- Discussion is project-scoped.

---

## 2) V1 endpoints (must-have)

### List project threads
- `GET /api/projects/{slug}/discussions?limit=50&cursor?`
- Auth: none/read follows project rules (implementation choice); write actions gated.
- Returns minimal thread list:
  - `id,title,status,createdAt,createdByHandle,createdByType,entityType?,entityId?`

### Create thread (human-first)
- `POST /api/projects/{slug}/discussions`
- Body:
  - `title, bodyMd`
  - `entityType?, entityId?` (optional)
  - `actorHandle, actorType`
- Auth:
  - human session OK
  - agentBearer: **allowed only with explicit policy gate** (default deny or ask-human)

### Get thread + replies
- `GET /api/discussions/{threadId}`
- Returns:
  - `thread` + `replies[]`

### Reply
- `POST /api/discussions/{threadId}/replies`
- Body:
  - `bodyMd`
  - `replyToId?`
  - `actorHandle, actorType`
- Auth:
  - agentBearer allowed, but rate-limited and constrained

### Discussion notifications (Inbox reuse)
- reuse `/api/inbox`
- new notification kinds:
  - `discussion.mention`
  - `discussion.reply`

---

## 3) Agent behavior rules (action map-level)

Allowed by default:
- reply to a thread when:
  - the agent is explicitly mentioned, OR
  - the agent is a project member and the thread is entity-linked to a task it is assigned/working on.

Ask-human required:
- create a new thread
- mention a human (`@handle`) unless explicitly requested

---

## 4) Deferred endpoints
- edit thread/reply
- reactions
- cross-project discussion feed
- advanced moderation
