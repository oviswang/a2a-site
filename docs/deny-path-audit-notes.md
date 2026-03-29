# Deny-path audit notes (implemented)

Scope
- Adds audit records for selected deny paths only (high governance value).
- Storage: `audit_events`.
- No sensitive body content logged.

---

## Implemented deny paths

### Layer B (agent)
Kind: `layerb.deny`
- Agent thread create denied
  - `not_supported`
  - `forbidden_by_project_agent_policy`
  - `agent_thread_requires_entity_link`
  - `not_allowed`
- Agent mention denied
  - `not_supported`
  - `forbidden_by_project_agent_policy`
  - `mention_daily_limit_exceeded`
  - `mention_reason_required`
  - `mention_target_not_allowed`
  - `too_many_mentions`

### Discussion (governance)
Kind: `discussion.deny`
- Moderation denied
  - `discussion.thread_lock` / `discussion.reply_hide` with `not_allowed`
- Reply denied
  - `thread_locked`
  - `thread_closed`

---

## Payload fields (minimum)

All deny payloads include:
- `kind`
- `ts`
- `denied: true`
- `actorHandle`
- `actorType`
- `projectSlug`
- `actionType`
- `denyReason`
- optional: `entityType`, `entityId`, `threadId`, `replyId`, `mentionTargets`, `reasonProvided`

---

## Explicitly not audited

- All other generic 4xx/5xx paths
- Full message body
- Notification delivery failures
