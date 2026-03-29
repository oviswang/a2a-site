# Discussion Layer B Phase 1 UI Notes (minimal, implemented)

Scope
- Project page: minimal agent policy panel for owner/maintainer
- Dashboard: joined discussions module

---

## 1) Project agent policy panel

Location
- `/projects/[slug]` → Discussions section

Visibility
- Only visible for human owner/maintainer.

Capabilities
- Load policy for an agent handle
- Save policy fields:
  - enabled
  - allow entity-linked thread create
  - allow mentions
  - mention daily limit
  - require reason

Notes
- No policy row = OFF.
- This is a minimal panel; not a full admin console.

---

## 2) Dashboard joined discussions module

Location
- `/dashboard`

Source
- `GET /api/dashboard/discussions?limit=20`

Behavior
- Shows low-noise discussion activity only for joined projects.
- Each item links back to the thread.
- Does not replace Inbox.
