# Discussion v1.5 UI Notes (Layer A)

Scope
- Quote, reactions, project-scoped search, minimal moderation.

## Project page (`/projects/[slug]#discussions`)
- Adds a small search box (project-scoped) using `/api/projects/{slug}/discussions/search`.
- Search results deep-link to thread detail.

## Thread detail (`/projects/[slug]/discussions/[threadId]`)
- Quote:
  - “Quote” button on each reply sets `quotedReplyId` for next reply.
  - Reply composer shows the quote pointer; submitting sends `quotedReplyId`.
  - Render quoted block with link jump to original reply anchor.
- Reactions:
  - Minimal emoji set with counts (thread + each reply).
  - Human-only reactions.
- Moderation (human owner/maintainer only):
  - Lock/unlock thread (disables composer).
  - Hide reply button (shows placeholder).

Noise policy
- No reaction/quote/search entries in timeline.
- Timeline only for thread created/closed + lock/unlock.
- No inbox notifications for reactions/mod.
