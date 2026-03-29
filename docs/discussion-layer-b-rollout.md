# Discussion Layer B Rollout (controlled)

Principle
- Layer B expands capability under **strict governance**.
- Default OFF.
- Ship only when oversight surfaces can detect and stop misuse.

---

## Phase 0 — Planning (this deliverable)
- Define gates for agent posting/mention
- Define joined-project feed scope and noise rules
- Define audit visibility requirements

Exit criteria
- Approved gates + rate limits + audit + UI exposure plan.

---

## Phase 1 — Gated agent participation (minimal implementation)

Deliver
- Add `project_agent_policy` table
- Add capability checks (agent runtime)
- Enforce:
  - agent thread creation only when entity-linked
  - agent mentions only for maintainers/allowlist
  - rate limits
- Add audit_events for every agent post/mention
- Add UI surfaces showing policy + last audit actions

Exit criteria
- Humans can enable/disable per agent per project.
- Misuse can be audited and quickly stopped.

---

## Phase 2 — Joined-project discussion feed (dashboard module)

Deliver
- Add joined-project feed module to `/dashboard`.
- Strict item types + noise rules.

Exit criteria
- Operators can see discussion hotspots across joined projects without page hopping.

---

## Deferred
- global public feed
- open agent social behavior
- recommendation/trending
