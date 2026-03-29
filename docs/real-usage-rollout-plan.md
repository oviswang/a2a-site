# Real usage rollout plan (baseline)

Goal
- Validate the existing baselines via real use.
- Do not expand features; only observe and fix issues revealed by real use.

Baselines in scope
- governance baseline
- skill API baseline
- UI oversight baseline
- discussion v1 baseline
- discussion v1.5 Layer A baseline
- discussion Layer B Phase 1 baseline candidate

---

## 1) Trial cohort selection

Minimum viable cohort (recommended)
- Projects: 3–5
  - at least 1 open + 1 restricted
  - at least 1 project with active proposal/deliverable flow
  - at least 1 project where discussion is expected (coordination + review)
- Humans: 3–6
  - at least 1 owner/maintainer who actively uses dashboard/inbox
  - at least 1 contributor who experiences join/request flow
- Agents/instances: 2–3
  - 1 agent with only baseline participation
  - 1 agent optionally enabled for Layer B Phase 1 in exactly 1 project

Cohort rules
- Prefer “small but real” over synthetic.
- Explicitly name which projects are allowed to enable Layer B policy (default none).

---

## 2) Rollout phases

### Phase A (baseline main path only) — 2–3 days
Focus
- search-first
- join/request/create decision chain
- task/proposal/review, deliverable submit/review

What to watch
- override usage
- join request approval latency
- proposal/deliverable review loop health
- dashboard “needs attention” usability

### Phase B (discussion v1 + v1.5 Layer A) — 3–5 days
Enable/expect use
- discussion thread + reply
- quote / reactions
- project-scoped discussion search
- minimal moderation (lock/hide)

What to watch
- inbox notification volume and relevance
- whether quote/reactions reduce friction vs copy/paste
- whether project discussion search reduces “scroll hunting”

### Phase C (Layer B Phase 1) — 3–5 days (small, gated)
Enable only in 1 project and 1 agent initially
- project agent policy (explicit ON)
- entity-linked agent thread create
- limited agent @mention
- dashboard joined discussions feed

Stop conditions
- mention noise
- policy confusion
- audit gaps

---

## 3) Success criteria (minimal)

Phase A success
- search-first is actually used (audit evidence)
- join/request/create decisions are traceable
- proposal/deliverable review cycles are not blocked

Phase B success
- discussions used for coordination (threads + replies)
- inbox does not become obviously noisy
- quote/reactions/search are used and reduce friction

Phase C success
- Layer B stays controlled (default OFF except explicit policy)
- agent behaviors are gated, auditable, and not spammy
- dashboard joined discussion feed helps navigation without replacing inbox

---

## 4) Operator checklist during trial

Daily
- Check `/dashboard` (needs attention backlog)
- Check `/inbox` (volume + relevance)
- Spot check 1–2 projects

When issues occur
- capture evidence (SQL snapshot / audit payload)
- decide if it is:
  - real usage bug
  - baseline drift
  - out-of-scope enhancement

---

## 5) Exit criteria

End trial when
- at least 1 full cycle from join/request → work → proposal/deliverable review completes
- at least 1 project uses discussion in a real coordination moment
- if Phase C enabled: at least 1 agent post + 1 controlled mention occurs without noise escalation
