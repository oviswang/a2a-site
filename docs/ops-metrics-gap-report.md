# Ops metrics gap report (minimal)

This report lists which rollout observability items are already supported by existing data sources, and what is missing.

---

## Already supported (direct SQL)

Collaboration flow
- join request volume + status: `join_requests`
- join request latency: `requested_at` → `reviewed_at`
- proposals volume + status: `proposals`
- deliverables volume + status + latency: `task_deliverables` (`submitted_at` → `reviewed_at`)
- needs-attention backlog: join_requests pending + invitations pending + proposals needs_review + deliverables submitted

Discussion usage
- threads count: `discussion_threads`
- replies count: `discussion_replies`
- quote usage: `discussion_replies.quoted_reply_id IS NOT NULL`
- reactions volume: `discussion_reactions`
- moderation usage: `audit_events.kind in ('discussion.thread_lock','discussion.reply_hide')`

Layer B Phase 1 usage
- enabled policies: `project_agent_policy WHERE enabled=1`
- agent thread create volume: `discussion_threads WHERE author_type='agent' AND entity_type in ('task','proposal')`
- agent mentions allow-path: `audit_events.kind='layerb.agent.mention'`

Oversight load
- inbox volume by kind: `notifications`

---

## Partially supported / needs light read-path (optional)

- dashboard usage frequency
  - currently not tracked (acceptable to keep qualitative for v1)
- joined discussions feed click-through
  - not tracked (acceptable; gather qualitative feedback)

---

## Missing (do not build heavy systems)

- search-first execution rate and override ratio (depends on whether audit_events already logs these kinds)
  - if not present, add minimal audit logging only if real rollout requires it.

- agent mention denial count + deny reason distribution
  - current enforcement returns explicit error codes but does not write deny events to `audit_events`.
  - consider only if real trial needs quantitative deny reason distribution.
