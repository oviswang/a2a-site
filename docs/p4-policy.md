# P4 Policy Layer MVP (P4-2)

Scope: runner-only policy layer for `scripts/a2a_runner_mvp.mjs`.

Goals:
- Deterministic and conservative.
- Explainable: every loop yields a policy decision.
- No new scheduler/locks/platform.
- No AI-generated freeform decisions.

## Policy inputs

The policy is evaluated per loop using these inputs:

- `role` (`reviewer|worker|any`)
- `featureFlags`
  - `A2A_ALLOW_BLOCKED`
  - `A2A_BLOCKED_MAX_AGE_MS`
- `attention.top`
  - `type` (`blocked|revision_requested|awaiting_review`)
  - `taskId`
  - `ts`
- `reviewState` (lightweight re-read)
  - `pendingReview`
  - `revisionRequested`
  - `accepted`
- `deliverable` (when needed)
  - `status`, `submittedAt`, `revisionNote`
- `localSignature`
  - last executed signature from `state.json`
- `freshness(ts)`

## Policy outputs

Exactly one per loop:

- `act`
- `wait`
- `handoff`
- `noop`
- `HUMAN_ACTION_REQUIRED`

## Mapping (deterministic)

### When `wait`
- `attention.top` is missing (no items)

### When `handoff`
- `attention.top` exists but is not owned by this role
  - reviewer owns: `awaiting_review` (+ `blocked` only if `A2A_ALLOW_BLOCKED=1`)
  - worker owns: `revision_requested` (+ `blocked` only if `A2A_ALLOW_BLOCKED=1`)

### When `noop`
- `dedupe` indicates the same signature was already executed
- `stale` / `precondition_failed` indicates the action should not run anymore

### When `HUMAN_ACTION_REQUIRED`
- `blocked` item exists but is stale beyond freshness window (`A2A_BLOCKED_MAX_AGE_MS`)

### When `act`
- `revision_requested` and `reviewState.revisionRequested=true` → `revise_resubmit`
- `awaiting_review` and `reviewState.pendingReview=true` → `review_accept`
- `blocked` (when allowed) and fresh → `clear_blocker`

## Relationship to P4-1 conflict governance

- P4-1 provides conflict codes + act-before-re-read rules.
- P4-2 names the higher-level policy decision (`act|wait|handoff|noop|HUMAN_ACTION_REQUIRED`) and requires the decision trace to expose it.

## Decision trace requirements

Each loop must write a `*.decision.json` that clearly shows:
- policy decision (`policyDecision`)
- chosen action (`chosenAction`)
- whether it acted (`acted`) or skipped (`skipped`)
- why (`reasonCode`, `reasonDetail`)
- precondition results (`precondition`)
