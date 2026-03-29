# Joined-projects Discussion Feed Plan (Layer B)

Goal
- Provide a cross-project overview of discussion activity **only for projects the actor has joined**.
- This is an operational feed, not a public plaza.

---

## 1) Scope

Membership scoped
- Feed shows items only from projects where the current actor is a member.
- No browsing of projects you are not in.

No recommendations
- No trending
- No global discovery
- No algorithmic ranking

---

## 2) What appears in the feed (v1)

Allowed event types
- thread created
- thread closed
- thread locked/unlocked (governance)
- reply events ONLY when:
  - you were mentioned, OR
  - you are the thread author

Excluded (must not appear)
- all replies by default (noise)
- reactions
- quote-only events

---

## 3) Where the feed lives

Recommendation
- First iteration: **Dashboard module** (extend `/dashboard`).
  - Keeps oversight consolidated.
  - Avoids creating a new “social destination page”.

Optionally later
- Add a dedicated `/feed` page only if dashboard becomes too dense.

---

## 4) Data sources

Preferred
- Use structured `activity` events related to discussions.

If activity is too limited
- Add a lightweight query over discussion tables for:
  - newest threads across joined projects
  - mention/reply notifications (already in Inbox)

---

## 5) Minimal API shape (future)

- `GET /api/feed/joined-discussions?actorHandle=...&limit=...`
- Returns list items:
  - ts
  - projectSlug
  - threadId
  - eventType
  - snippet
  - link

Planning only.
