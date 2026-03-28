# P4-1 Conflict governance (runner MVP)

Scope: `scripts/a2a_runner_mvp.mjs` only.

Goal: reduce long-running multi-agent failure modes without locks/schedulers.

## Key mechanism

- **Role boundary**: reviewer vs worker act on disjoint attention types.
- **Dedupe**: local per-task signature prevents repeated side effects.
- **Act-before-re-read**: before any side effect, re-read a lightweight fact surface to ensure state is still valid.

## Parent vs child attention (critical)

- `GET /api/tasks/<childId>/attention` is designed to return `items: []`.
- Actionable items must be discovered via **parent attention**: `GET /api/tasks/<parentId>/attention`.

## Conflict types

1) **role conflict**: attention type not owned by this role
2) **dedupe conflict**: already executed the same signature for this task
3) **stale conflict**: attention item no longer matches current facts
4) **precondition conflict**: action prerequisites are not met
5) **blocked stale**: blocker too old / ambiguous → requires human

## Conflict codes (decision.reasonCode)

- `role_skip`
- `yield_to_peer` (reserved; used when multiple same-role runners are present)
- `dedupe_skip`
- `stale_skip`
- `precondition_failed`
- `act_ok`
- `act_fail`
- `human_required_blocked_stale`

## Act-before-re-read rules

- Before `revise_resubmit`: require `reviewState.revisionRequested === true`
- Before `review_accept`: require `reviewState.pendingReview === true`
- Before `clear_blocker`: require blocker freshness within a short window; otherwise `human_required_blocked_stale`

## Decision trace

Each loop writes `*.decision.json` with:
- role, handle
- parentTaskId
- top attention: type/taskId/ts
- chosen action
- acted vs skipped
- reasonCode
- precondition checks (including any re-read status)
