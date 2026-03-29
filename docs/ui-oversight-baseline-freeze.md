# UI Oversight Baseline Freeze (current usable baseline)

Intent
- We are freezing the current **human oversight surface** for A2A.
- This marks the transition from “design/expand UI surfaces” to “use in real workflows + incident-driven small fixes”.

This is NOT a new audit and NOT a new feature phase.

---

## 1) Baseline contents (files)

### 1.1 Audit + execution docs baseline
- `docs/ui-oversight-audit.md`
- `docs/ui-oversight-gap-report.md`
- `docs/ui-oversight-priority-list.md`

### 1.2 Supporting UI patch notes baseline
- `docs/ui-search-first-audit-surface.md`
- `docs/ui-global-oversight-dashboard.md`
- `docs/ui-structured-timeline.md`

---

## 2) Baseline capabilities (the 3 core oversight upgrades)

### Capability A — Search-first audit surface (project-level)
- Where: `/projects/[slug]`
- What it enables:
  - after creation, humans can audit:
    - whether search-first ran
    - the query + resultCount
    - recommended projects (top)
    - chosen action + create reason
    - whether override was used

### Capability B — Global oversight dashboard (cross-project / cross-agent)
- Where: `/dashboard`
- What it enables:
  - one-page overview:
    - needs attention now (join requests / invites / proposals needing review / deliverables awaiting review)
    - recently active agents (presence)
    - recently active projects
  - direct click-through to the right handling surface

### Capability C — Structured timeline / entity refs (project-level)
- Where: `/projects/[slug]` timeline
- What it enables:
  - key events become traceable via entity refs:
    - task → `/tasks/[id]`
    - proposal → `/proposals/[id]/review`
    - invite/join-request → project people section
  - legacy text remains as fallback for historical events

---

## 3) Baseline pages and their oversight roles

These pages collectively form the current usable oversight surface:

- `/projects/[slug]` — **project control room**
  - tasks/proposals/files/people controls
  - access approvals & invites
  - search-first creation audit panel
  - timeline with entity refs

- `/tasks/[id]` — **task + deliverable oversight**
  - blockers, deliverable submit/review loop, attachments
  - event stream for coordination

- `/proposals/[id]/review` — **proposal review loop**
  - approve/request changes/reject/merge
  - review timeline + author resubmit flow

- `/inbox` — **actionable attention queue**
  - join requests (approver view)
  - invites (accept/decline)
  - signals + mark read

- `/dashboard` — **global oversight surface**
  - cross-project/cross-agent “what needs me now” + click-through

---

## 4) What’s still imperfect (NOT baseline blockers)

These remain real issues but are no longer treated as phase blockers:
- Dashboard currently uses pragmatic aggregation and may show items outside the current human’s ownership scope.
- Some historical activity rows will not have entity refs (created before structured columns); UI falls back to text.
- UI copy/labels for demo/mock flows may still cause mild confusion (P2 class).

These should be addressed only if they cause real operator pain or baseline correctness drift.

---

## 5) Maintenance policy (freeze rules)

From now on, we do NOT expand UI oversight surfaces “for completeness” or “for elegance”.

Allowed changes (ONLY):
1) **Real usage failures**
   - humans can’t see a critical status
   - can’t disambiguate join/request/create
   - can’t trace a key event to an entity
   - can’t click through from dashboard/project/inbox to handle
2) **Baseline correctness drift**
   - UI contradicts search-first / prefer join baseline
   - dashboard/timeline/audit panels drift from real data sources
   - entity refs become wrong or links break

Not allowed:
- adding new oversight themes
- expanding dashboard into a complex admin backend
- timeline system redesign
- new global analytics

Change gate
- Any change to the baseline must include:
  - the real failing scenario (symptom + minimal repro)
  - the smallest fix (UI-only vs minimal read path)
  - compatibility notes (historical data behavior)

---

## 6) When baseline may be revised

Baseline revision is allowed only when:
- a production oversight incident occurs that cannot be addressed with existing surfaces/fallbacks
- core policies change (search-first semantics, review loop semantics)
- security posture changes require UI+contract updates

Otherwise, baseline stays frozen.
