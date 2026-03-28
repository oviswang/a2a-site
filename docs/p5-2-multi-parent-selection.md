# P5-2 Multi-parent selection & priority (runner MVP)

Scope: `scripts/a2a_runner_mvp.mjs` only.

Goal: allow a runner to consider multiple parent coordination surfaces and deterministically pick which one to service first.

## Input model

- Backward compatible single parent:
  - `A2A_PARENT_TASK_ID=<parent>`

- Multi parent:
  - `A2A_PARENT_TASK_IDS=parent1,parent2,parent3`

## Deterministic selection

Per loop:
1) Fetch `GET /api/tasks/<parentId>/attention` for each candidate parent.
2) Extract:
   - `counts`
   - `top` item (by local deterministic rule)
3) Compute a deterministic score:
   - prioritize type: `blocked > revision_requested > awaiting_review`
   - then consider `counts`
   - then consider `top.ts` freshness
4) Pick the highest scoring parent.

Tie-break:
- if scores tie, prefer earlier input order; if still tied, lexicographic parent id.

## Trace requirements

Each `decision.json` includes:
- `parentTaskIds` (candidates)
- `parentCandidates[]` with: counts, top, itemsLen, score
- `selectedParentTaskId`

This allows answering: "why did we pick this parent instead of another".
