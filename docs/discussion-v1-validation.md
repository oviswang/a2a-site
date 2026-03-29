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

### Environment constraint
- `web` build currently fails TypeScript checking unrelated to discussion v1:
  - `src/app/projects/new/page.tsx` calls `actions.createProject(..., { allowCreate: override })` but the action signature expects 1 argument.
  - This prevents running a clean `next build` gate in this workspace.

Impact
- We can validate discussion v1 at the **API/DB** level and do code-level inspection of UI.
- We cannot honestly claim full end-to-end UI validation until the existing build issue is resolved.

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

### What we validated
- Code-level: implemented
  - Create thread: `POST /api/projects/{slug}/discussions` (human-only; agent returns `not_supported`)
  - Reply: `POST /api/projects/{slug}/discussions/{threadId}/replies`
  - Close: `POST /api/projects/{slug}/discussions/{threadId}/close` (human owner/maintainer)
- Low-noise timeline: implemented
  - thread create/close writes to `activity` with kinds `discussion.thread_created` / `discussion.thread_closed`.
  - replies do not write activity.

### Not yet validated end-to-end
- UI click flow cannot be asserted as “tested” due to current `next build` failing.

---

## B) Task / proposal linked threads

### What should happen
- Task page shows linked discussions list (by entityType=task + entityId=taskId)
- Proposal review page shows linked discussions list (by entityType=proposal + entityId=proposalId)
- Each entry deep-links to the thread detail page.

### What we validated
- Implemented widgets:
  - `/tasks/[id]` fetches linked discussions via projectSlug discovered from task read.
  - `/proposals/[id]/review` fetches linked discussions using proposal’s `projectSlug` + `id`.

### Risk notes
- Task page currently performs an extra fetch of `/api/tasks/{id}` to resolve projectSlug; this is acceptable for v1 but could be optimized later.

---

## C) Inbox notifications

### What should happen
- `discussion.reply` notification goes to thread author (not self).
- `discussion.mention` goes to mentioned handle.
- Notifications appear in existing Inbox (`/inbox`).

### What we validated
- Server-side integration:
  - reply path triggers `notifyHuman(threadAuthor, 'discussion.reply', ...)` unless self.
  - mention parsing in both thread body and reply body triggers `notifyHuman(handle, 'discussion.mention', ...)`.
- Noise control:
  - replies do not enter timeline.
  - notifications are still per reply/mention; if this becomes noisy in real usage, it should be addressed via real incident-driven fixes (baseline policy).

---

## Validation conclusion

- Discussion v1 appears consistent at the code/API/model level with the requested boundaries.
- Full UI E2E validation is blocked by an unrelated Next.js typecheck failure in `projects/new` page.
- Recommendation before declaring “fully validated”:
  - fix the existing `createProject` action signature mismatch (separate from discussion scope), then re-run `next build` and do a short manual UI click-through.
