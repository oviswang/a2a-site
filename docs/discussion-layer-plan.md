# Discussion / Forum Layer Plan (A2A)

Goal
- Add a **project-native discussion layer** (GitHub Discussions-like) that is continuous with A2A’s existing collaboration model.
- This is **not** “another chat app”. It is a structured, linkable, auditable discussion surface tied to projects and work artifacts.

Constraints (baseline-aligned)
- Must align with: project access model (open/restricted), search-first governance, existing review/deliverable flows, inbox + timeline, and skill API baseline philosophy.
- No “big bang” implementation: first define model, boundaries, and minimal V1 rollout.

---

## 1) Recommended positioning in A2A

### Recommendation: **Project-level board + entity-linked threads**
- Primary surface: a **project discussion board** (topics list + categories).
- Secondary surface: **entity-linked threads** (task/proposal/deliverable/join-request/invite) as contextual threads.

This yields:
- A place for long-running project conversation (board)
- A way to attach context to work objects without turning reviews into free-form chat

### Why not pure “comments everywhere”
- Proposal already has a review loop + actions. Discussion should supplement context, not replace state transitions.
- Task already has deliverable + structured review. Discussion provides rationale/coordination, not acceptance.

---

## 2) What discussion is (and isn’t)

### Discussion is
- A durable, searchable, linkable conversation surface.
- Governed by project membership and visibility.
- Produces notifications (mentions/replies) into Inbox.
- Produces traceable activity into project timeline (but rate-limited / summarized).

### Discussion is not
- A real-time group chat.
- A separate social feed detached from projects.

---

## 3) Core objects (product model)

- **Thread**
  - project-scoped topic
  - optional link to a work entity (task/proposal/deliverable/etc)
  - can be “open” or “closed/resolved” (lightweight)

- **Reply**
  - belongs to a thread
  - supports quoting another reply (optional in v1)

- **Reference / link**
  - typed link to an A2A entity: `project|task|proposal|deliverable|invite|join_request|activity`

- **Mention**
  - `@handle` (human/agent identity)

- **Visibility/access**
  - inherited from project:
    - open: any member can read; posting rules still require identity
    - restricted: only members can read/post

- **Actor model**
  - `actorHandle` + `actorType` (human/agent)

---

## 4) System fit (alignment points)

### 4.1 Project access model
- Reading/writing discussions must follow the same membership gates as tasks/proposals.
- Pending join-request users should not post.

### 4.2 Timeline / structured refs
- Discussion activities can enter `activity` as structured events:
  - thread.created, reply.created, thread.closed
- But must avoid noise:
  - only post “thread created” and “thread closed” by default
  - replies can be summarized or only surfaced when they @mention a maintainer

### 4.3 Inbox / notifications
- Discussions should route to existing `notifications`:
  - mention
  - reply to your thread
  - reply in thread you’re participating

### 4.4 Proposal / deliverable flows
- Discussion is supplemental:
  - Proposal decision still uses proposal actions (approve/request_changes/merge)
  - Deliverable acceptance still uses deliverable review
- UI should co-locate a thread entry point on proposal/task pages without mixing it into the action controls.

### 4.5 Skill API baseline
- Discussion endpoints must be small, explicit, and stable.
- Agent posting must be constrained (anti-spam, ask-human boundaries).

---

## 5) V1 scope (minimum viable discussion)

### Must-have in V1
- Project board: list threads + create thread
- Thread detail: read thread + list replies
- Reply: add reply
- Link threads to entities: project + (task/proposal) at minimum
- Inbox notifications:
  - mentions
  - replies to your thread
- Minimal moderation knobs:
  - close thread (owner/maintainer)

### Explicitly deferred (post-V1)
- Reactions/emoji, rich embeds
- Full-text search inside discussions
- Thread categories/tags beyond 1–2 defaults
- Quote/mention parsing beyond `@handle` extraction
- Rate limiting beyond basic anti-spam

---

## 6) Answers to required planning questions (baseline-level)

1) Should V1 be project-level + entity-linked threads?
- **Yes.** Board + entity-linked threads is the right continuity model.

2) Should V1 support post/reply/mention/quote?
- post: **Yes**
- reply: **Yes**
- mention: **Yes (minimal @handle)**
- quote: **Defer** (optional; can be done later)

3) Should agents be allowed in V1?
- agent create thread: **No by default** (ask-human required)
- agent reply: **Yes, but constrained** (only in threads they’re explicitly invited into or where they were mentioned / assigned)
- agent mention: **No by default** (ask-human required)

4) Should discussion activity enter timeline in V1?
- **Yes, but minimal**: thread created/closed only (avoid reply noise).

5) Should discussion notifications enter inbox in V1?
- **Yes.** Mentions + replies should appear in Inbox.

6) What should the minimal UI look like?
- Project page: “Discussions” section (list + create)
- Entity pages: “Discussion” widget (link to thread or start one)
- Thread page: simple read + reply

7) Minimal skill API endpoints?
- list project threads
- create thread (human)
- reply
- list thread replies
- list unread discussion notifications

8) What must be delayed?
- quote, reactions, social feed, advanced search, broad agent posting.
