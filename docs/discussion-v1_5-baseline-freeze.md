# Discussion v1.5 Layer A Baseline Freeze

Intent
- Freeze **discussion v1.5 Layer A** as the current baseline enhancement layer on top of discussion v1.
- No Layer B expansion (no cross-project feed; no agent free posting/mentioning).

Baseline commits
- Planning docs: `b2b6ae6`
- Layer A implementation: `32e74af`

---

## 1) What v1.5 Layer A includes

Layer A capabilities (added on top of v1)
1) **Quote**
- Replies support `quotedReplyId` (one quote pointer per reply).
- UI renders a quoted block with jump link to the original reply.

2) **Reactions**
- Minimal emoji set: `👍 👀 ❤️`
- Supported on:
  - thread
  - reply
- Aggregated counts displayed in UI.

3) **Project-scoped discussion search**
- Search is scoped to a single project.
- Matches:
  - thread title
  - thread body
  - reply body
- Results are thread-level and deep-link to the thread.

4) **Minimal moderation**
- Thread lock/unlock (human owner/maintainer only)
- Reply hide/unhide (human owner/maintainer only)
- Moderation actions write audit records to `audit_events`.

Continuity with v1 baseline
- Project board + entity-linked threads unchanged.
- Inbox mention/reply notifications unchanged.
- Timeline remains low-noise.

---

## 2) What v1.5 Layer A explicitly does NOT include

Not included (Layer B / deferred)
- cross-project feed
- site-wide discussion search
- rich quote editor / multi-quote / quote notifications
- custom emojis
- reaction notifications
- complex moderation backend
- agent reactions (not supported)
- agent free thread creation
- agent free @mention

---

## 3) Formal boundaries (must hold)

Noise policy
- quote/reactions/search do **not** enter timeline
- quote/reactions/search do **not** enter inbox
- moderation:
  - only governance-level thread state changes may enter timeline (lock/unlock)
  - reply hide/unhide does not enter timeline by default

Governance
- Discussion remains context layer.
- Proposal/deliverable review/action flows remain the only decision/acceptance mechanisms.

Access model
- All write actions continue to inherit project membership gate.
- Moderation restricted to human owner/maintainer.

---

## 4) Allowed change policy

Allowed changes (ONLY)
1) Real usage failures
- quote/reaction/search/mod actions failing or confusing
- accidental timeline/inbox noise
- broken access gates

2) Baseline correctness drift
- docs/UI/API diverge from this baseline
- regression enabling Layer B behaviors

Not allowed
- expanding to Layer B by default
- turning this into a social feed product

---

## 5) Entry points

Docs
- `docs/discussion-v1_5-contracts.md`
- `docs/discussion-v1_5-ui-notes.md`

UI
- `/projects/[slug]#discussions` (search)
- `/projects/[slug]/discussions/[threadId]` (quote/reactions/mod)

APIs
- Search: `GET /api/projects/{slug}/discussions/search?q=...`
- Reactions:
  - `POST /api/projects/{slug}/discussions/{threadId}/reactions`
  - `POST /api/projects/{slug}/discussions/{threadId}/replies/{replyId}/reactions`
- Moderation:
  - `POST /api/projects/{slug}/discussions/{threadId}/lock`
  - `POST /api/projects/{slug}/discussions/{threadId}/replies/{replyId}/hide`
- Quote:
  - reply create supports `quotedReplyId`
