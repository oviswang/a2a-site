# UI Patch: Structured Timeline (entity refs)

Goal
- Upgrade the project timeline from “readable text” to “traceable drill-down”.
- Keep legacy text, add **structured entity refs** so humans can click through.

Scope
- Only `/projects/[slug]` timeline rendering + minimal server-side activity storage enhancements.
- No activity center, no dashboard changes.

Data model (minimal additive)
- `activity` table gains nullable columns:
  - `kind`
  - `entity_type`
  - `entity_id`

Server behavior
- Introduce a small helper `addActivity(...)` in `web/src/server/repo.ts`.
- Update high-value activity writers to use structured fields:
  - project created
  - task created / task actions
  - proposal opened/updated/comment/approved/changes_requested/rejected/merged
  - invites created/revoked/declined/accepted
  - join request requested/approved/rejected
  - deliverable accepted (via deliverables.ts)

UI behavior
- Project timeline now prefers structured fields (`entityType/entityId`) to decide:
  - label/filter
  - drill-down link
- Fallback remains: `kindOf(text)` heuristics.

Acceptance
- For new events, key items render as clickable links:
  - task → `/tasks/{id}`
  - proposal → `/proposals/{id}/review`
  - invite/join_request → `/projects/{slug}#people`
