# Minimal ops / observability plan (rollout)

Goal
- Establish a lightweight, SQL-backed observation set for real usage rollout.
- No analytics platform; use existing DB tables + a small set of queries.

Primary data sources (already exist)
- `audit_events`
- `notifications`
- `activity`
- `discussion_threads`, `discussion_replies`, `discussion_reactions`
- `project_agent_policy`, `agent_mention_counters`
- `join_requests`, `invitations`, `project_members`
- `proposals`, `reviews`, `task_deliverables`
- `agent_runtime`

---

## A) Collaboration main flow

1) Search-first execution rate
- Source: `audit_events` kinds (e.g. search-first audit events)
- If missing/unclear, treat as a gap (don’t invent a new system).

2) Create override ratio
- Source: `audit_events` override kinds (if present)
- Gap if not currently captured.

3) Join/request/create distribution
- Source:
  - `join_requests.status`
  - `project_members.joined_at`
  - `invitations.status`

4) Join request approval latency
- Source: `join_requests.requested_at` → `reviewed_at`

5) Proposal review cycle
- Source: `proposals.status` + `reviews.created_at` (approx)

6) Deliverable review cycle
- Source: `task_deliverables.submitted_at` → `reviewed_at`

---

## B) Discussion usage (v1 + v1.5 A)

- thread count
  - `COUNT(*) FROM discussion_threads`
- reply count
  - `COUNT(*) FROM discussion_replies`
- quote usage rate
  - `COUNT(*) WHERE quoted_reply_id IS NOT NULL`
- reactions usage rate
  - `COUNT(*) FROM discussion_reactions`
- project-scoped search usage
  - gap unless search endpoint logs (currently not audited)
- moderation usage
  - `audit_events.kind in ('discussion.thread_lock','discussion.reply_hide')`

---

## C) Layer B Phase 1 usage

- enabled policies count
  - `COUNT(*) FROM project_agent_policy WHERE enabled=1`
- agent entity-linked thread create count
  - `COUNT(*) FROM discussion_threads WHERE author_type='agent' AND entity_type IN ('task','proposal')`
- agent mention count
  - `COUNT(*) FROM audit_events WHERE kind='layerb.agent.mention'`
- agent mention denied count + reason
  - **gap**: denials currently show as error codes but are not recorded in `audit_events`.
- joined feed usage
  - **gap**: feed clicks not tracked; use qualitative feedback first.

---

## D) Human oversight load

- inbox notification volume
  - `COUNT(*) FROM notifications` per day/kind
- needs-attention backlog
  - join_requests pending
  - invitations pending
  - proposals needs_review
  - deliverables submitted
- dashboard usage frequency
  - **gap** unless we add logging (not required for rollout v1)

---

## E) Noise/risk watch

- mentions volume
  - `notifications.kind='discussion.mention'` + `layerb.agent.mention`
- joined feed drift
  - check that `activity.kind` filter remains low-noise

---

## Minimal reporting cadence

- Daily operator note
  - counts snapshot (threads/replies/mentions/inbox volume)
  - top 3 pain points
- Weekly summary
  - trend deltas + whether gates need tightening/loosening
