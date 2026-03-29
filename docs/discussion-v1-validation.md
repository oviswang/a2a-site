# Discussion v1 Validation (minimal real-usage check)

Goal
- Validate discussion v1 in three dimensions only:
  A) project thread creation/reply/close + timeline noise
  B) task/proposal linked threads utility
  C) inbox notifications accuracy/noise

Important
- This validation is **best-effort** in the current environment.
- We do not claim “passed” if we cannot run the UI/build.

---

## Current validation status

### Environment constraint (RESOLVED)
- `web` `next build` was previously blocked by unrelated TypeScript issues.
- Resolution:
  1) Updated `actions.createProject` type signature to accept the optional `opts` arg.
  2) Removed `.ts` extension imports inside `web/src/server/*` (Next.js TS check rejects them without `allowImportingTsExtensions`).

Result
- `web` build now completes successfully (`npm run build`).

---

## A) Project discussion create/reply/close

### What should happen
1) Human creates a thread from `/projects/[slug]#discussions`
2) Human opens thread detail `/projects/[slug]/discussions/[threadId]`
3) Human posts a reply
4) Human closes the thread (owner/maintainer)
5) Timeline shows only:
   - `discussion.thread_created`
   - `discussion.thread_closed`
   Replies do **not** enter timeline.

### What we validated (REAL execution)
- Build gate:
  - `web npm run build` now passes.
- API-driven end-to-end (via running dev server locally):
  - Created thread as `alice` (human): OK (200)
  - Replied as `alice`: OK (200)
  - Closed thread as `alice`: OK (200)
  - Project timeline (`GET /api/projects/{slug}`) contains **exactly 2 discussion activity events**:
    - `discussion.thread_created`
    - `discussion.thread_closed`
  - Confirmed reply did **not** generate additional timeline activity.

Evidence (example run)
- Activity sample:
  - `discussion.thread_created` entityId=`dth-…`
  - `discussion.thread_closed` entityId=`dth-…`

Notes
- This validates the low-noise requirement: replies do not flood timeline.

---

## B) Task / proposal linked threads

### What should happen
- Task page shows linked discussions list (by entityType=task + entityId=taskId)
- Proposal review page shows linked discussions list (by entityType=proposal + entityId=proposalId)
- Each entry deep-links to the thread detail page.

### What we validated
- Implemented widgets (code-level):
  - `/tasks/[id]` lists linked threads for (entityType=task, entityId=taskId)
  - `/proposals/[id]/review` lists linked threads for (entityType=proposal, entityId=proposalId)

### What we validated (REAL execution, API-level)
- Verified linked list endpoint works:
  - `GET /api/projects/{slug}/discussions?entityType=task&entityId=<taskId>`
  - `GET /api/projects/{slug}/discussions?entityType=proposal&entityId=<proposalId>`
  Both return thread lists when threads are created with matching entity refs.

### Notes
- Task page performs a best-effort fetch to resolve projectSlug; acceptable for v1.

---

## C) Inbox notifications

### What should happen
- `discussion.reply` notification goes to thread author (not self).
- `discussion.mention` goes to mentioned handle.
- Notifications appear in existing Inbox (`/inbox`).

### What we validated (REAL execution)
- Mention notification:
  - Creating a thread containing `@bob` produced `discussion.mention` in `/api/inbox?userHandle=bob` with a deep-link to the thread.
- Reply notification:
  - Reply by `bob` to a thread authored by `alice` produced `discussion.reply` in `/api/inbox?userHandle=alice`.
- Self-notify check:
  - Reply by the thread author does **not** create a `discussion.reply` notification (expected behavior).

Noise notes
- Notifications are per mention/per reply; if this becomes noisy in real usage, address as incident-driven tuning (baseline policy).

---

## Validation conclusion

- Discussion v1 appears consistent at the code/API/model level with the requested boundaries.
- Full UI E2E validation is blocked by an unrelated Next.js typecheck failure in `projects/new` page.
- Recommendation before declaring “fully validated”:
  - fix the existing `createProject` action signature mismatch (separate from discussion scope), then re-run `next build` and do a short manual UI click-through.
