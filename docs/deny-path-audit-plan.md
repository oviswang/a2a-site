# Deny-path audit (Layer B + discussion) plan

Why now
- We can already observe allow-path for policy upsert and agent mentions.
- Deny-path is currently only visible as 4xx error codes in API responses.
- Without deny auditing, we cannot tune gates (too strict/too loose) with evidence.

---

## 1) Current audit coverage (as-is)

Already audited (allow-path)
- `layerb.policy.upsert`
- `layerb.agent.mention` (counts + targets + reason)
- moderation allow-path:
  - `discussion.thread_lock`
  - `discussion.reply_hide`

Not audited (deny-path)
- Agent create denied by policy / missing policy
- Agent mention denied by:
  - forbidden_by_project_agent_policy
  - mention_daily_limit_exceeded
  - mention_reason_required
  - mention_target_not_allowed
  - too_many_mentions
- Human moderation denied by role
- Reply denied when thread locked/closed

---

## 2) What we should audit (v1)

Priority 1 (Layer B)
1) agent entity-linked thread create denied
- reasons:
  - not_supported (no policy row)
  - forbidden_by_project_agent_policy
  - agent_thread_requires_entity_link
  - not_allowed (not project member)

2) agent mention denied
- reasons:
  - not_supported
  - forbidden_by_project_agent_policy
  - mention_daily_limit_exceeded
  - mention_reason_required
  - mention_target_not_allowed
  - too_many_mentions

Priority 2 (discussion governance)
- moderation denied (not owner/maintainer)
- reply denied due to `thread_locked` / `thread_closed`

Non-goals
- audit every 4xx
- log full body_md content

---

## 3) Minimal audit event schema

Event shape (payload_json)
- `kind`
- `ts`
- `actorHandle`
- `actorType`
- `projectSlug`
- `action` (e.g. discussion.thread_create / discussion.reply_create / discussion.mention)
- `denied: true`
- `denyReason` (the exact error string returned)
- `entityType/entityId` if present
- `threadId` if known
- `mentionTargets` if present (handles only)
- `mentionReasonProvided: boolean` (do not store full free-text by default; optional truncate if needed)

Store
- `audit_events` table (same as existing)

---

## 4) Where to emit deny audits

Preferred
- In repo enforcement functions (single source of truth)
- Catch specific deny errors and emit a deny audit event before throwing.

Alternative
- In API routes: catch error, emit deny audit, return 400.

Recommendation
- Repo-level (less drift, fewer callsites).

---

## 5) Minimal implementation steps (if we implement)

- Add helper `auditDeny()` to repo
- In agent gates:
  - when policy missing/disabled → write deny audit then throw
  - when mention fails (reason/role/limit) → write deny audit then throw
- In discussion reply path:
  - thread_locked/thread_closed → write deny audit (actorHandle/type)

Out of scope
- dashboards for deny stats
- alerts
- privacy-sensitive body capture
