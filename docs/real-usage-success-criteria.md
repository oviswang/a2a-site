# Real usage success criteria (baseline rollout)

Purpose
- Define what “real usage proved baseline is usable” means.
- Prevent drift into feature expansion.

---

## Global criteria (must hold)

- Project access model holds (no feed/access bypass).
- Oversight surfaces remain usable:
  - `/dashboard` stays readable
  - `/inbox` does not become obviously noisy
  - timeline stays low-noise
- Any problems found are categorized:
  - real usage issue (fix)
  - baseline drift (fix)
  - out-of-scope enhancement (defer)

---

## Phase A (main flow) success

Evidence
- At least 1 real cycle completes:
  - join/request → work → proposal review OR deliverable review
- Join request decisions are traceable (who approved/rejected, when).

Operational
- Needs-attention backlog does not grow unbounded.

---

## Phase B (discussion v1 + v1.5 A) success

Evidence
- At least 2 threads created across projects for real coordination.
- At least 5 replies in total by humans.

Feature usefulness
- Quote used at least once and perceived as better than copy/paste.
- Reactions used at least once and perceived as lightweight (not spam).
- Project-scoped discussion search used at least once to find context.

Noise
- Discussion notifications remain targeted (mentions/replies only).

---

## Phase C (Layer B Phase 1) success (optional, gated)

Controlled enablement
- Default OFF holds globally.
- Only 1 project enables policy for 1 agent initially.

Evidence
- Agent entity-linked thread create succeeds at least once.
- Agent mention succeeds at least once with reason.
- Agent mention rate limit triggers at least once (proves enforcement).

Oversight
- Audit evidence exists for policy upsert and agent mention.
- Dashboard joined discussions feed helps navigation without replacing inbox.

---

## Stop conditions

Stop or roll back Phase C if
- mentions become noisy
- unclear policy UI leads to accidental enabling
- audit is insufficient to attribute behavior
