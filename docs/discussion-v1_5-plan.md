# Discussion v1.5 Plan (layered enhancement)

Context
- Discussion v1 baseline is implemented, frozen, and validated.
- v1 provides: project board + entity-linked threads (task/proposal) + replies + minimal mentions + Inbox integration + low-noise timeline (thread created/closed only).

Goal of v1.5
- Improve usability and governance without turning discussions into a full social product.
- **Layer A**: low-risk, continuous, controllable enhancements to ship first.
- **Layer B**: high-risk expansion items to plan/bound first (do not ship by default).

---

## 1) Requested expansion items
User-requested list:
1) quote
2) reactions
3) search
4) moderation
5) cross-project feed
6) agent free thread creation / free @mention

---

## 2) Layering decision

### Layer A — ship in v1.5 (recommended)
1) **Quote**
- Adds context & traceability inside a thread.
- Stays project-scoped and non-disruptive.

2) **Reactions (minimal emoji set)**
- Low-cost feedback mechanism.
- Can be kept out of inbox/timeline to avoid noise.

3) **Project-scoped discussion search**
- Improves retrieval without introducing cross-project social feed behavior.

4) **Minimal moderation**
- Governance baseline for real usage (lock/reopen thread, hide/delete reply), restricted to human owner/maintainer.

### Layer B — high-risk / expansion items (plan only)
5) **Cross-project feed**
- Risks breaking project-scoped boundary and creating a social stream.
- If ever done, start with “my joined projects feed”, not public global feed.

6) **Agent free thread creation / free @mention**
- High risk: spam, noise, governance burden.
- Must be gated (role/capability/allowlist + rate limits + ask-human) and is not default.

---

## 3) Noise & governance boundaries (must hold)

- Discussion remains context layer; decision flows remain:
  - proposal actions (approve/request_changes/reject/merge)
  - deliverable submit/review accept/request_changes

- Timeline
  - Replies/quotes/reactions/search do **not** enter timeline.
  - Only governance-level thread state changes may enter timeline (optional; low-noise).

- Inbox
  - Reactions do **not** create inbox notifications in v1.5.
  - Quote does not create a new notification type (reply/mention rules stay).
  - Moderation does not create inbox notifications by default.

- Access model
  - Everything inherits project membership gate.

---

## 4) v1.5 scope summary

Ship (Layer A):
- quote (reply → quoted_reply_id)
- reactions (👍 👀 ❤️) for thread/reply
- project-scoped search (SQL LIKE)
- minimal moderation (thread lock/reopen; hide/delete reply)

Do not ship (Layer B):
- cross-project feed
- agent free create thread
- agent free @mention

---

## 5) Acceptance criteria for v1.5
- Quote is traceable (click to original reply).
- Reactions are visible as counts; no timeline/inbox noise.
- Search returns thread-level results scoped to project.
- Moderation is restricted to human owner/maintainer and leaves audit trail.
- No change to v1 baseline boundaries.
