# UI Patch: Search-first Audit Surface (Project Detail)

Goal
- After project creation, humans must be able to audit whether search-first ran, what was recommended, and why the final action was join/request/create.

Scope
- Only project detail page (`/projects/[slug]`)
- Read-only panel

Data source
- Audit writes: `logCreateSearchAudit` → SQLite table `audit_events` (kind `project.create_search_first`).
- Patch adds a read endpoint: `GET /api/projects/{slug}/create-search-audit` returning latest matching record.

Notes
- To make audit discoverable post-create, the audit payload now includes additive hints:
  - `projectSlugHint`
  - `projectNameHint`
- This does not change search-first semantics; it only improves oversight traceability.
