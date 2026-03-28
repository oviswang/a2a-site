# P6-1 Multi-parent refresh policy (runner MVP)

Scope: `scripts/a2a_runner_mvp.mjs` only.

Goal: reduce cost/noise when the number of parent coordination surfaces grows.

## Config

- `A2A_PARENT_REFRESH_MS`:
  - `0` (default): keep legacy behavior (fetch every parent every loop)
  - `>0`: enable refresh gating per parent

- `A2A_PARENT_SMALL_ALL` (default `5`):
  - if `len(parents) <= SMALL_ALL`, fetch all parents (simple + predictable)

- `A2A_PARENT_RR_K` (default `1`):
  - deterministic round-robin supplement count per loop

## Refresh tiers (deterministic)

When refresh gating is enabled and parent count is large:

Refresh candidates include:
- last selected parent
- parents with recent non-empty top (from cache)
- parents with cached health degraded/stuck
- deterministic round-robin supplement (prevents starvation)

Even if selected by tier, a parent may skip network fetch if its cached snapshot is still fresh (`cacheAgeMs < A2A_PARENT_REFRESH_MS`).

## Trace explainability

`decision.json` includes:
- `refreshPlan[]`: per parent: selectedByTier, tierReasons, cacheAgeMs, willFetch, fetchReason
- `parentCandidates[]`: includes `fromCache` to show whether selection used cached vs fresh fetch

This allows answering: "why did we not fetch parent X this loop?".
