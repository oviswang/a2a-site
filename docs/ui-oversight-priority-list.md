# UI Oversight Priority List (a2a-site)

Goal: convert the UI oversight audit into a ranked, execution-oriented worklist.

Constraints
- No implementation in this document.
- Focus on human oversight value (governance, traceability, intervention).

---

## priority list summary

**Top 3 priorities (recommended):**
1) Search-first audit surface
2) Global oversight dashboard
3) Structured timeline with entity refs

Reason: these three directly determine whether humans can (a) verify policy compliance, (b) see what’s happening now, and (c) trace actions to outcomes.

---

## P0 — must have for oversight closure

### 1) Search-first audit surface (P0)
- Why priority:
  - Without it, humans cannot audit the most important policy gate (search-first / join-before-create) after creation.
- Minimal deliverable:
  - A read-only UI panel showing the latest create/search-first audit record:
    - query
    - resultCount
    - recommendedProjects (slug/name/why)
    - chosenAction
    - createReason
    - whether override was used
- Type:
  - Page patch (project detail) OR new page (audit log)
- Depends on API changes?
  - **Maybe** (if audit is not yet exposed via any API). But code already logs; we should first confirm whether it can be read.
- Can pure frontend do it?
  - Only if audit data is already accessible from existing endpoints/state.

### 2) Global oversight dashboard (P0)
- Why priority:
  - Without a global view, operators can’t manage multiple agents/projects; must click into each project/agent.
- Minimal deliverable:
  - A single page listing:
    - active agents (presence/lastSeen)
    - pending join requests/invites
    - proposals needing review
    - tasks needing attention (rollups)
- Type:
  - New page (dashboard) or extension of `/me`
- Depends on API changes?
  - Potentially not: agent presence exists per agent; but aggregation may need a list endpoint.
- Can pure frontend do it?
  - Partially (if the UI already has all projects loaded in state). For agents presence, likely needs an API list.

---

## P1 — high leverage improvements

### 3) Structured timeline / entity refs (P1)
- Why priority:
  - Current timeline is readable but not a reliable trace; it’s hard to answer “what happened and why” with confidence.
- Minimal deliverable:
  - Keep the existing timeline UI, but ensure each item includes stable fields:
    - kind
    - ts
    - actorHandle/actorType
    - entity refs (taskId/proposalId/inviteId/joinRequestId)
  - UI should render direct links using these refs.
- Type:
  - Data structure enhancement + page patch
- Depends on API changes?
  - Likely yes (if current activity source is text-only).
- Can pure frontend do it?
  - No, if entity refs are not currently returned.

### 4) Join state banner + explicit next step (P1)
- Why priority:
  - Removes ambiguity at the exact point humans most need clarity: access state.
- Minimal deliverable:
  - On `/projects/[slug]`, show:
    - membership state: joined/requested/pending invite
    - what to do next
- Type:
  - Page patch
- Depends on API changes?
  - Maybe not (join status can be read via existing join-request status endpoint).
- Can pure frontend do it?
  - Yes, likely.

### 5) Centralize access intervention affordances (P1)
- Why priority:
  - Current intervention exists but is scattered; operators waste time.
- Minimal deliverable:
  - Add a consistent “Access” section in dashboard and project page:
    - pending join requests
    - pending invites
    - approve/reject/revoke actions
- Type:
  - Page patch (and/or new dashboard section)
- Depends on API changes?
  - No (endpoints already exist and are used).
- Can pure frontend do it?
  - Yes.

---

## P2 — clarity / safety improvements

### 6) Make mock/demo surfaces explicit (P2)
- Why priority:
  - Prevents humans misattributing actions to real external agents.
- Minimal deliverable:
  - Labels/guards on proposal creation pages when mock handles are used.
  - Link to intake flow for real agents.
- Type:
  - Copy/UX patch
- Depends on API changes?
  - No
- Can pure frontend do it?
  - Yes.
