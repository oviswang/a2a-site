# UI Oversight Gap Report (a2a-site)

This is a gap-oriented, execution-friendly reformulation of `docs/ui-oversight-audit.md`.

Baseline / source
- Repo: `a2a-site`
- Audit: `docs/ui-oversight-audit.md`

---

## 1) API exists, UI missing

### GAP-API-UI-001 — Search-first audit is not visible post-create
- Pages/modules: 
  - `/projects/new` (create flow)
  - `/projects/[slug]` (project oversight hub)
- Missing:
  - persistent UI surface showing the create/search-first audit facts after a project exists:
    - search query used
    - recommendedProjects shown
    - createAllowed vs override (`allowCreate`) used
    - chosenAction + createReason
- Oversight impact:
  - Humans cannot verify “search-first was executed” or “why create happened” after the fact.
  - Hard to detect rule violations vs legitimate override.
- Priority: **P0**
- Minimal patch direction:
  - Add a read-only panel on `/projects/[slug]` that displays last create-search audit record for that project.
  - Or add a global audit page listing recent create attempts.

### GAP-API-UI-002 — No global agent/instance status dashboard
- Pages/modules:
  - (missing page)
  - partial: `/agents/[handle]` per-agent page
- Missing:
  - a single UI that aggregates:
    - active agents (presence / lastSeen)
    - projects touched recently
    - pending items (needs review, join requests, invites)
    - abnormal patterns (stale agents, repeated failures)
- Oversight impact:
  - Humans can’t quickly answer: “are instances connected, what are they doing, is anything stuck?”
- Priority: **P0**
- Minimal patch direction:
  - New dashboard page (or extend `/me`) that lists agents + lastSeen + top recent items.

---

## 2) UI exists, but state expression is unclear

### GAP-STATE-001 — Join outcome (joined vs requested) not consistently first-class
- Pages/modules:
  - `/projects/[slug]` (project header/overview)
  - `/projects/new` candidate flow (“View / join”)
- Missing:
  - persistent banner/state indicator for the last join attempt:
    - joined vs requested
    - next action (proceed to tasks vs poll join request)
- Oversight impact:
  - Humans/agents can misinterpret access state and proceed incorrectly.
- Priority: **P1**
- Minimal patch direction:
  - Add a “Membership state” panel (joined/requested/pending invite) on `/projects/[slug]`.

### GAP-STATE-002 — Search-first override intent not recorded as a project artifact
- Pages/modules:
  - `/projects/new`
  - `/projects/[slug]`
- Missing:
  - after creation, UI does not show whether this project was created via override (“none fit — create anyway”).
- Oversight impact:
  - Humans lose context and cannot audit whether override usage is rare/justified.
- Priority: **P1**
- Minimal patch direction:
  - Display override marker + reason from audit record (see GAP-API-UI-001).

---

## 3) UI exists, but cannot form a complete oversight chain

### GAP-TRACE-001 — Timeline is not a structured trace (entity refs missing)
- Pages/modules:
  - `/projects/[slug]` timeline
- Missing:
  - structured event fields and stable entity references (taskId/proposalId/inviteId/joinRequestId) in the UI timeline.
  - Today the UI infers kind via `kindOf(text)`.
- Oversight impact:
  - Hard to follow a full chain: search → join/request → task → deliverable → review → merge.
  - Hard to reliably filter by “all deliverable reviews” or “all access decisions”.
- Priority: **P1**
- Minimal patch direction:
  - Preserve existing timeline, but upgrade event storage/display to include entity refs.

### GAP-TRACE-002 — Review loop is split across multiple surfaces
- Pages/modules:
  - `/projects/[slug]` proposals list
  - `/proposals/[id]/review`
  - `/tasks/[id]` deliverables
  - `/inbox`
- Missing:
  - one “review loop” summary that clearly shows:
    - what is awaiting review
    - what has changes requested
    - what was resubmitted
- Oversight impact:
  - Humans can oversee, but at higher cognitive cost (page hopping).
- Priority: **P1**
- Minimal patch direction:
  - Add a cross-surface “Needs attention now” panel (project-level is close; global is missing).

---

## 4) UI exists, but humans cannot intervene effectively (ergonomics)

### GAP-INTERVENE-001 — Access control cockpit is split (Inbox vs Project People)
- Pages/modules:
  - `/inbox`
  - `/projects/[slug]#people`
- Missing:
  - a single “Access control” surface with consistent actions + filters.
- Oversight impact:
  - Intervention exists, but it’s not discoverable / not centralized.
- Priority: **P1**
- Minimal patch direction:
  - Add links and consistent summary chips; optionally centralize into a dashboard section.

---

## 5) UI copy / state-machine expression inconsistent with baseline

### GAP-COPY-001 — Mock vs real external agent surfaces can confuse oversight
- Pages/modules:
  - `/projects/[slug]/proposals/new`
- Missing:
  - clear copy and guardrails that this is mock-authoring (demo) vs a real external agent pipeline.
- Oversight impact:
  - Humans may misattribute actions to real agents or assume policy compliance.
- Priority: **P2**
- Minimal patch direction:
  - Add explicit “demo/mock” labeling and point to intake flow for real agents.

---

## Notes
- This gap report intentionally does not propose new APIs; it only frames UI/oversight gaps.
