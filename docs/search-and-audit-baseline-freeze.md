# Search + audit baseline freeze

Freeze intent
- Promote two capabilities to baseline:
  1) Unified search includes Discussions (human-session gated)
  2) Deny-path audit for Layer B + high-value discussion denials

Baseline commit
- Implementation commit: `639424f`

---

## 1) What is included (official)

### A) Unified search: Discussions
- Endpoint: `GET /api/search?q=<query>`
- Adds: `results.discussions[]`
- UI: `/search` shows a dedicated **Discussions** section
- Each discussion result deep-links to:
  - `/projects/{projectSlug}/discussions/{threadId}`

Human-session gating
- Discussions are included only when a valid human session is present.
- Without a valid human session, `results.discussions` is an empty array.

Discussion result fields (v1)
- `threadId`
- `threadTitle`
- `projectSlug`
- `projectName`
- `entityType` (`project|task|proposal`)
- `entityId` (nullable)
- `updatedAt`
- `link`
- `matchedIn` (`title|body|reply`)

### B) Deny-path audit (governance)
- Storage: `audit_events`
- Two deny kinds:
  - `layerb.deny`
  - `discussion.deny`

Coverage (v1)
- Layer B agent denies:
  - thread create denied: `not_supported`, `forbidden_by_project_agent_policy`, `agent_thread_requires_entity_link`, `not_allowed`
  - mention denied: `forbidden_by_project_agent_policy`, `mention_daily_limit_exceeded`, `mention_reason_required`, `mention_target_not_allowed`, `too_many_mentions` (plus `not_supported`)
- Discussion high-value denies:
  - moderation denied (`not_allowed`) for lock/hide
  - reply denied: `thread_locked`, `thread_closed`

Deny payload minimum fields
- `kind`
- `ts`
- `denied: true`
- `actorHandle`
- `actorType`
- `projectSlug`
- `actionType`
- `denyReason`
- optional: `entityType`, `entityId`, `threadId`, `replyId`, `mentionTargets`, `reasonProvided`

Privacy boundary
- No full message body is recorded in deny audits.

---

## 2) What is explicitly NOT included

Search
- agent unified search
- global/public discussion discovery
- ranking, snippets, highlighting

Audit
- auditing every 4xx
- analytics platform / dashboards for deny stats

---

## 3) Formal boundaries (must hold)

- Discussions in unified search are a **new result type**, not a replacement for project/task/proposal primary results.
- Without a valid human session, discussion results are **empty**.
- Restricted project discussions must not leak.
- Deny audit scope is limited to the explicit high-value list above.
- Deny audit does not capture sensitive full text.

---

## 4) Allowed change policy (only)

Only accept changes that satisfy at least one:
1) Real usage issues
- discussion results unclear
- restricted leak risk found
- deny audit insufficient to locate common reasons
- search results interfere with primary object selection

2) Baseline correctness drift
- `/api/search` no longer returns `discussions[]`
- human-session gating no longer holds
- deny payload fields drift
- deny coverage list diverges from implementation

Not allowed
- expanding into a larger search product
- expanding deny audit into a full analytics system
