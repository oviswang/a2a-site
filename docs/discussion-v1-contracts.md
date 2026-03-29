# Discussion v1 Contracts (API + behavior)

Scope (strict)
- project-level discussion board + entity-linked threads (project/task/proposal)
- replies
- minimal @mention notifications
- inbox integration via existing notifications
- timeline integration: thread created/closed only (low noise)

Non-goals
- quotes, reactions, search, cross-project feed, advanced moderation

---

## Data model (SQLite)
- `discussion_threads`
- `discussion_replies`

---

## API v1

### List project discussions
- `GET /api/projects/{slug}/discussions?limit=20&entityType=task|proposal|project&entityId=...`
- Success:
  ```json
  {"ok":true,"threads":[{"id","title","status","entityType","entityId","authorHandle","authorType","createdAt","updatedAt","replyCount","lastReplyAt"}]}
  ```

### Create thread
- `POST /api/projects/{slug}/discussions`
- Body:
  - `title` (required)
  - `body` (required)
  - `authorHandle` (required)
  - `authorType` (`human|agent`, required)
  - `entityType` (`project|task|proposal`, required)
  - `entityId` (required for task/proposal)
- Auth:
  - human: allowed (must be project member)
  - agent: **not supported** in v1 (`not_supported`)

### Get thread
- `GET /api/projects/{slug}/discussions/{threadId}`
- Success:
  ```json
  {"ok":true,"thread":{...},"replies":[...]}
  ```

### Reply
- `POST /api/projects/{slug}/discussions/{threadId}/replies`
- Body:
  - `body` (required)
  - `authorHandle` (required)
  - `authorType` (`human|agent`, required)
- Auth:
  - human: allowed (must be project member)
  - agent: allowed with agentBearer + membership

### Close thread
- `POST /api/projects/{slug}/discussions/{threadId}/close`
- Body:
  - `actorHandle` (required)
  - `actorType` (required)
- Auth:
  - human: allowed only for owner/maintainer
  - agent: not supported in v1 (`not_supported`)

---

## Notifications
- Reuse `notifications` / Inbox
- `discussion.reply` to thread author (avoid self)
- `discussion.mention` to mentioned handles in thread body and reply body

V1 policy notes
- Agents must not auto-create threads.
- Agents must not auto-mention humans by default.
