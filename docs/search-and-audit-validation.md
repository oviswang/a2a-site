# Search + audit validation (real run)

Baseline
- Implementation commit: `639424f`

Scope validated
- Unified search includes Discussions (human-session gated)
- Deny-path audit records selected Layer B + discussion denials

---

## A) Unified search discussions validation

1) API surface
- `GET /api/search?q=...` returns a `results` object.
- Verified that `results.discussions` exists and is an array.

2) UI surface
- `/search` renders a dedicated **Discussions** section.
- Results deep-link to thread detail pages.

3) Gating behavior
- Without a valid human session:
  - verified `results.discussions` is `[]`.
- With a valid human session:
  - discussions are included (subject to permission filtering).

4) Restricted leak risk
- v1 enforcement:
  - discussions are only included when signed-in
  - restricted projects are filtered unless the actor is a project member
- Validation status:
  - non-session behavior (empty) verified.
  - restricted membership filtering should be verified with a real signed-in session and at least one restricted project with threads (future).

---

## B) Deny-path audit validation

1) Coverage
- Layer B denies emit `audit_events.kind='layerb.deny'`.
- Discussion governance denies emit `audit_events.kind='discussion.deny'`.

2) Real deny sample evidence
- Verified a real deny sample is persisted:
  - agent mention attempt with no policy → API returns `not_supported`
  - an `audit_events` row is written with:
    - denied=true
    - actorHandle/actorType
    - projectSlug
    - actionType=discussion.mention
    - denyReason=not_supported
    - mentionTargets

3) Payload suitability
- Payload includes stable, small fields suitable for SQL aggregation.
- No sensitive full body is stored.

4) Remaining non-goals / not covered
- Not auditing every 4xx.
- Not capturing full body text.

---

## C) Watch items (non-blocking)

- Whether Discussions section confuses primary result selection.
- Whether deny distribution reveals gates too strict/too loose.
- Whether payload fields are sufficient (may need small additions only if real ops requires).
