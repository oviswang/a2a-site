# Multi-agent execution protocol (P3-B-1) — stable long-running collaboration

Purpose: make multi-agent “always-on” collaboration more stable **without** adding a scheduler, distributed locks, or a new platform.

This protocol is the next step after:
- `docs/multi-agent-rules.md` (roles + boundaries)
- `docs/multi-agent-run-mode.md` (how to run two roles)

Here we define:
- who reads first / who acts first
- ownership rules for ambiguous cases (blocked)
- handoff visibility conventions
- dedupe + freshness rules (deterministic)

---

## Roles (two, unchanged)

- **Worker**: does deliverable drafting + revision/resubmit; may set self blockers.
- **Reviewer/Coordinator**: does review decisions; may clear external blockers.

Hard rule:
- Worker does **not** review.
- Reviewer does **not** edit deliverables.

---

## Shared fact surfaces (what we trust)

- **attention** (parent): deterministic queue of “needs action”
- **task events**: append-only fact log
- **deliverable**: status + revisionNote + submittedAt
- **blocker**: coarse stop signal

We do not invent hidden state.

---

## Deterministic pick order (within a role)

Each role reads parent attention and selects its top actionable item using:
1) type priority
2) timestamp recency (newest first)
3) taskId tie-break (lexicographic)

Type priority:
- Worker: `revision_requested > blocked`
- Reviewer: `awaiting_review > blocked`

(Note: `blocked` is shared; ownership rules below decide who acts.)

---

## Who acts on the same attention item?

### revision_requested
- **Worker only**
- Reviewer must role-skip.

### awaiting_review
- **Reviewer only**
- Worker must role-skip.

### blocked (ambiguous)
Default principle: **only clear when you can justify ownership deterministically**.

**Worker clears blocked** when:
- the task’s most recent blocker-related event (or last actor event) is by worker, OR
- the task is authored by worker and worker can proceed now.

**Reviewer clears blocked** when:
- blocker reason indicates external dependency that reviewer resolved (policy decision), OR
- the task is in a review pipeline state and reviewer is the next actor.

If neither can justify ownership:
- noop + trace (do not fight toggling).

---

## Handoff visibility (events/notes)

We keep handoff visible without new schema:

- Worker (after resubmit) should ensure the deliverable submission is visible:
  - the deliverable submission itself creates events

- Reviewer (after accept/request_changes) uses review action events.

In traces, the handoff should be readable as:
`revision_requested -> deliverable_put -> deliverable_submit -> awaiting_review -> deliverable_review(accept)`

---

## Dedupe protocol (no locks)

Each role maintains `state.json` (per trace dir) and must avoid repeating the same side effect.

Signatures:
- revision_requested: `(taskId, normalize(revisionNote))`
- awaiting_review: `(taskId, submittedAt)` (fallback `deliverable.status`)
- blocked: `(taskId, isBlocked)` + (optional) last blocker event ts

Freshness rule:
- only retry an action if either:
  - the signature changed, OR
  - enough time passed and echo indicates no state transition happened

---

## Acceptance criteria (P3-B-1)

Multi-agent long-running mode is considered “more stable” when:
- reviewer never writes deliverables
- worker never reviews
- both roles avoid duplicate side effects on the same item
- traces clearly show handoff in the revision→review loop

---

## References

- `docs/multi-agent-rules.md`
- `docs/multi-agent-run-mode.md`
- `scripts/a2a_runner_mvp.mjs`
