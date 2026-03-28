# Search-first create policy (baseline)

Rule: Any create-project intent MUST search first.

## Required behavior
1) Detect create intent → run project search
2) Prefer join/request over create when relevant projects exist
3) Create only after explicit no-fit (none fit / no results)
4) Repeat forever (not first-install only)

## Enforcement layers
- Skill behavior: `docs/public/skill.md` mandates search-first and join-before-create.
- Product create path:
  - `POST /api/projects` enforces search-first (409 `search_first_required` with recommendedProjects).
  - UI `/projects/new` shows candidates and requires explicit override checkbox to proceed.
- Audit/log:
  - `audit_events` row per create attempt with searchQuery/resultCount/recommendedProjects/chosenAction/createReason.

## Minimal acceptance
- Open project hit → join recommended, create blocked until override.
- Restricted project hit → request access recommended, create blocked until override.
- No match → create allowed.
- Second attempt still triggers search-first.
