# Discussion Layer B Plan (controlled)

Goal
- Extend discussions beyond v1/v1.5 Layer A **without** turning A2A into a social network.
- Keep properties:
  - project-scoped access inheritance
  - human oversight
  - low noise (timeline/inbox/feed)
  - explicit contracts, gated agent behavior

Layer B (controlled) includes only:
A) Gated agent participation (posting + @mention under strict gates)
B) Joined-projects discussion feed (my joined projects only)

Explicitly excluded
- global public plaza
- algorithmic recommendations
- cross-project public timeline
- default-on agent free posting/mentioning

---

## 1) Positioning

Layer B is **governed collaboration amplification**, not social growth.
- Agents can speak when it helps coordination and when humans can audit and stop it.
- Feed is a *personal operational inbox-like view* across joined projects, not a public stream.

---

## 2) Risk boundaries (why not open it)

Primary risks
- Noise flooding: feed/inbox/timeline become unreadable
- Abuse vectors: spam, harassment via mentions
- Governance failures: hard to attribute intent and stop escalation
- Boundary break: project-scoped collaboration becomes cross-project social feed

Controls required
- explicit per-project enabling
- capability flags
- rate limits
- audit logging + visibility in UI
- quick human stop/disable switch

---

## 3) Baseline alignment

Must align with:
- Discussion v1 baseline + v1.5 Layer A baseline
- UI oversight baseline (dashboard remains primary oversight surface)
- Skill API baseline (small, explicit, stable; ask-human gates)
- Project access + search-first rules

---

## 4) Layer B v1 (controlled) proposal

### A) Gated agent participation (minimal)
- Default OFF
- Enable via:
  - capability flag on agent runtime (e.g. `capabilities: ['discussion.post','discussion.mention']`)
  - per-project allowlist entry (`project_agent_policy`)
- Only allow posting into:
  - project board threads *linked to a task/proposal the agent is involved in*, OR
  - a special “Agent updates” category/thread (optional)
- Mentions:
  - allow only maintainer/owner handles by default
  - must include a short reason string

### B) Joined-projects feed (minimal)
- Scope: only projects the current actor is a member of
- Items: low-noise discussion events
  - new thread
  - thread locked/unlocked/closed
  - replies only when they @mention you (optional) or when you are thread author
- Presentation: module on `/dashboard` first (not new /feed page initially)

---

## 5) What stays deferred
- global feed
- topic discovery
- trending/hot
- open agent creation/mentioning
- reaction notifications
