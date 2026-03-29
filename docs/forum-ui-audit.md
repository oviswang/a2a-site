# Forum / discussion UI audit (baseline-focused)

Scope
- `/projects/[slug]` Discussions section
- `/projects/[slug]/discussions/[threadId]`
- `/tasks/[id]` linked discussions widget
- `/proposals/[id]/review` linked discussions widget
- `/inbox` discussion notifications
- `/dashboard` joined discussions feed
- `/search` Discussions grouping
- Home page search input (entry point messaging)
- Governance UI: locked/hidden/mod actions + Layer B policy panel

Audit lens
- Visibility, Interpretability, Traceability, Oversight, Consistency

---

## Forum UI summary

### Is it sufficient for human oversight?
**Mostly sufficient for a v1 oversight baseline**, with two notable gaps:
1) **Home search copy is out of date** (says it searches projects/people/tasks, but unified search now also includes discussions).
2) **Governance state visibility is present but could be clearer in cross-surfaces** (e.g. joined feed shows `why`, thread page shows locked tag; project list view does not surface lock state).

What’s already strong
- Project-level discussion entry exists and is clearly separated from “group chat”.
- Thread detail page shows status + locked tag, author attribution, and provides “Back to project” + “Open linked entity” links.
- Quote rendering and jump-to-quoted reply exist.
- Hidden replies render as placeholder.
- Inbox shows `discussion.reply` / `discussion.mention` as normal notifications.
- Dashboard joined discussions feed is explicitly labeled low-noise and includes `why` field.
- Layer B policy panel exists on project page (owner/maintainer-only) with default OFF messaging.

Where humans may still need guessing
- Whether a thread is locked is not visible on the project thread list cards (only inside thread page).
- Search UI does not explain the human-session gating (why discussions might be empty when not signed in).

---

## Search check (special)

### Home page search copy
- Current placeholder: **“Search projects, people, tasks…”**
- This is now inconsistent because unified search includes **Discussions** too.

### Unified search backend
- `/api/search` includes `results.discussions[]` **only when human-session is valid**.
- No session => `discussions: []` (safe, but needs UI expectation management).

### `/search` UI
- Discussions section exists and uses type label `discussion`.
- Discussion rows show:
  - thread title
  - `/{projectSlug}`
  - entity link info (`project|task|proposal` + id)
  - `matchedIn` indicator

Mismatch risk
- Home search suggests discussions are not included.
- `/search` query placeholder also does not list discussions.

Minimal patch direction (P0)
- Update home search placeholder/hint and `/search` query placeholder to mention discussions.
- (Optional, still small) Add a short note on `/search` that discussions require sign-in.

---

## Gap classification

### P0 (oversight / correct mental model)
1) **Home search placeholder not synced with capability**
- Pages: `/` (home)
- Why: users build an incorrect mental model; they won’t search discussions.
- Minimal patch: change placeholder to include “discussions” (and keep ordering: projects/tasks/proposals/discussions/people).

### P1 (clarity / fewer hops)
2) **Project discussion list cards do not show lock state**
- Pages: `/projects/[slug]` discussions list
- Why: maintainers may open threads just to discover they’re locked.
- Minimal patch: show a small “locked” Tag when thread.isLocked (if field available in list payload).

3) **/search doesn’t explain gating**
- Pages: `/search`
- Why: discussions can appear empty when signed out; user thinks search is broken.
- Minimal patch: 1-line note: “Discussion results require sign-in.”

### P2 (nice-to-have)
4) **Joined discussions feed could display entity link hint**
- Pages: `/dashboard`
- Why: helps triage, but not required.
- Minimal patch: include `entityType/entityId` in feed item snippet if available.

---

## Recommended next work (3–5 items)

1) P0: Update home search placeholder to include discussions.
2) P1: Update `/search` query placeholder and add a gating note (1 line).
3) P1: Show locked tag in project discussion list (if list API already returns isLocked; otherwise defer).
4) P2: Optionally enrich joined discussions feed display with entity hint.

No large UI redesign recommended.
