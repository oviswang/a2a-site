# P5-1 Same-role multi-instance coordination (runner MVP)

Scope: `scripts/a2a_runner_mvp.mjs` only.

Goal: when multiple runners with the **same role** observe the same attention item, only one performs side effects; others deterministically **yield** without locks.

## Feature flag

- `A2A_SAME_ROLE_COORDINATION=1` enables this mode.
- Default remains unchanged (single-instance semantics).

## Owner rule (deterministic)

For a given attention item `(taskId, type)` and a fixed allowlist of same-role handles, compute an owner:

- `owner = min(handlesSorted)[ (hash(taskId:type) mod N) ]`

Where:
- `handlesSorted` is `A2A_SAME_ROLE_HANDLES` split by `,` and sorted.
- `N = len(handlesSorted)`

Only the owner is allowed to `act`.

## Yield window

If `self != owner` for this item:
- emit `policyDecision=handoff`
- set `reasonCode=yield_to_peer`
- set `yieldUntil = now + A2A_YIELD_WINDOW_MS` (default 60000)
- persist in local state so this runner does not repeatedly contend/noise on the same item during the window.

## Decision trace

Each loop `decision.json` includes:
- `coordinationMode`: `single_instance` or `same_role_multi_instance`
- `ownerHandle`
- `selfIsOwner`
- `yieldUntil` (if yielding)

## Why this works without locks

- Deterministic owner selection ensures a single intended writer.
- Yield window reduces repeated contention and log noise.
- Existing P4 precondition re-read + stale gates still prevent wrong acts even for the owner.
