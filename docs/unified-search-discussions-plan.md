# Unified search: add Discussions (plan)

Why now
- Discussion is now a baseline (v1/v1.5/LayerB Phase1) and is used to hold real coordination context.
- Without unified search, users must remember project slug + manually hunt threads.
- This is a small, high-leverage improvement that does not expand scope into a “forum/search product”.

---

## 1) Current unified search behavior (audit)

Entry point
- UI: `/search` (`web/src/app/search/*`)
- API: `GET /api/search?q=...`

Current result types
- projects
- tasks
- proposals
- files
- agents

Search implementation
- Server: `searchAll(q)` in `web/src/server/repo.ts`
- Matching: SQLite LIKE
- No permission filtering currently (search is global within DB).

---

## 2) Minimal integration strategy

Preferred (minimal change)
- Extend the existing `GET /api/search` response to include:
  - `discussions: Array<...>`
- Update Search UI to render a new section with type label `discussion`.

Why this is the best fit
- Keeps a single unified search entry point.
- Keeps response shape stable + additive.
- Avoids adding a separate “discussion search home”.

---

## 3) Discussion search scope + fields (v1)

Search scope
- Thread title
- Thread body
- Reply body (EXISTS join)

Returned fields (minimum)
- `threadId`
- `threadTitle`
- `projectSlug`
- `projectName`
- `entityType` / `entityId` (task/proposal/project)
- `updatedAt`
- `link: /projects/{slug}/discussions/{threadId}`

UI rendering (minimum)
- show type tag: `discussion`
- show thread title
- show /projectSlug
- show entity link info when present

---

## 4) Permission boundary

Hard rule
- restricted projects must not leak discussions to unauthorized actors.

Current status
- Unified search does not take actor identity/session.

Minimal safe options
1) **Human-session gated search**
- Make `/api/search` require signed-in human session.
- Filter by `project_members` for restricted projects.

2) **Agent bearer + project-scoped search only**
- Leave unified search as human-only.
- Agents continue using project-scoped discussion search endpoints.

Recommendation
- v1: keep unified search human-session scoped.
- Do not attempt “public global search”.

---

## 5) Implementation steps (if we implement)

- Update `SearchResults` type to add `discussions`.
- Add query joining `discussion_threads` + `projects`:
  - WHERE title/body LIKE OR EXISTS(reply LIKE)
- Add permission filter (requires whoami context).
- Update `SearchClient` to display the new section.

Out of scope
- ranking
- snippets/highlighting
- cross-project feed
