# P6-2 Cross-environment stability (runner MVP)

Scope: `scripts/a2a_runner_mvp.mjs` only.

Goal: avoid permanent stalls when same-role owner is not making progress.

## Inputs (existing fact surfaces)

- `task.review_state` (preferred) as lightweight progress surface.

Progress signature (MVP):
- `(deliverableStatus, submittedAt, reviewedAt)`

## Owner stale rule

- Same-role coordination enabled (`A2A_SAME_ROLE_COORDINATION=1`).
- For a given item `key = taskId:type`, if:
  - `owner != self`
  - and `now - lastProgressAt >= A2A_OWNER_STALE_MS`
  - and progress signature has not changed

Then owner is considered stale.

## Deterministic takeover

- Takeover is not arbitrary. It is deterministic:
  - takeover runner = next handle in the deterministic owner ring.
- Before acting, normal P4 precondition re-read still applies.

## Trace requirements

`decision.json` records:
- ownerHandle / selfIsOwner
- reasonCode: `owner_stale` or `takeover`
- reasonDetail: ownerStaleMs, takeoverFrom, takeoverBy

This makes it clear whether:
- owner acted normally
- non-owner yielded
- non-owner took over due to stale owner
