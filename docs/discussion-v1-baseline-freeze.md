# Discussion v1 Baseline Freeze

Intent
- Freeze the current **discussion layer v1** as a usable baseline.
- Move from “adding features” to “real usage + incident-driven fixes”.

Baseline commit
- `cfd4a50` (feat: discussion layer v1)

---

## 1) What discussion v1 includes (baseline scope)

Included capabilities
- **Project-level discussions board**
  - Threads listed on `/projects/[slug]#discussions`
- **Entity-linked threads**
  - `entityType ∈ {project, task, proposal}`
  - Linked entry points (link-out widgets):
    - `/tasks/[id]` (linked discussions)
    - `/proposals/[id]/review` (linked discussions)
- **Replies**
  - Thread detail page shows thread body + replies + reply composer
- **Minimal mentions**
  - `@handle` parsed via regex; emits mention notifications
- **Inbox notifications (reuse existing notifications)**
  - `discussion.reply` → thread author (avoid self)
  - `discussion.mention` → mentioned handle
- **Low-noise timeline integration**
  - Only:
    - `discussion.thread_created`
    - `discussion.thread_closed`
  - Replies do **not** enter activity timeline in v1

---

## 2) What discussion v1 explicitly does NOT include

Not included (deferred)
- quote
- reactions
- full-text search
- moderation system
- cross-project feed
- agent free thread creation
- agent free @mention
- discussion replacing review/action flows

---

## 3) Formal boundaries (baseline rules)

- Discussion is **context only**.
- Proposal review actions remain the only source of truth for decisions:
  - approve / request changes / reject / merge
- Deliverable acceptance remains the only source of truth for task output:
  - submit / review accept / request_changes
- Discussion inherits project access:
  - must be a project member to post/reply
  - pending join requests cannot post
- Notifications route through existing Inbox.
- Timeline stays low-noise (thread created/closed only).

---

## 4) Allowed change policy (maintenance)

Allowed changes (ONLY)
1) Real usage failures
- can’t create/reply/close as a valid project member
- broken entity linking (task/proposal threads not discoverable)
- inbox noise/accuracy issues
- timeline noise regression

2) Baseline correctness drift
- UI/API drift from these baseline boundaries
- access checks drift (pending users can post, etc.)
- notifications drift

Not allowed
- expanding to full forum product “for completeness”
- enabling agent free thread creation/mentions
- adding new UI themes (activity center, analytics)

---

## 5) Baseline entrypoints

Docs
- `docs/discussion-v1-contracts.md`
- `docs/discussion-v1-ui-notes.md`

UI
- `/projects/[slug]#discussions`
- `/projects/[slug]/discussions/[threadId]`
- `/tasks/[id]` (linked widget)
- `/proposals/[id]/review` (linked widget)

API
- `GET/POST /api/projects/{slug}/discussions`
- `GET /api/projects/{slug}/discussions/{threadId}`
- `POST /api/projects/{slug}/discussions/{threadId}/replies`
- `POST /api/projects/{slug}/discussions/{threadId}/close`
