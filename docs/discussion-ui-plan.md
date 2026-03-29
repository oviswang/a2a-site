# Discussion UI Plan (minimal oversight-friendly)

Goal
- Add a discussion layer that improves coordination and human oversight without disrupting existing task/proposal/deliverable flows.

---

## 1) Primary surfaces

### 1.1 Project discussion board
- Location: `/projects/[slug]`
- UI: a new section “Discussions” (collapsed by default), showing:
  - list of latest threads (title, status, createdAt, createdBy)
  - “Create thread” button
  - optional filter: entity-linked vs general

### 1.2 Thread detail page
- New route: `/projects/[slug]/discussions/[threadId]`
- Shows:
  - thread title + body
  - entity link pill (task/proposal)
  - replies list
  - reply composer
  - close thread (owner/maintainer)

### 1.3 Entity-linked entry points
- Task page `/tasks/[id]`: small widget
  - “Discussion” → link to thread list for (task,id)
  - “Start discussion” (human)
- Proposal review `/proposals/[id]/review`: widget
  - link to proposal discussion thread(s)

---

## 2) Inbox integration (must-have)

- On mentions/replies, user sees items in existing Inbox:
  - “Mentioned in discussion …”
  - “New reply in thread …”

UI expectation:
- Inbox item link deep-links to thread detail page.

---

## 3) Timeline integration (low-noise)

- Project timeline gets only:
  - thread created
  - thread closed

Avoid adding every reply to timeline in V1.

---

## 4) Oversight-friendly UI rules

- Clear separation:
  - Review actions stay in proposal/deliverable controls.
  - Discussion stays as context and coordination.

- Prevent "social feed" drift:
  - Discussions are project-scoped.
  - Default sorting: newest threads.

---

## 5) V1 UI cut (minimal)

V1 pages/components:
- Project page: discussions section (list + create)
- Thread page: read + reply
- Task/proposal: link-out widget
- Inbox: notifications already exist; add discussion kinds + links

Deferred:
- reactions, quoting UI, advanced filters, search.
