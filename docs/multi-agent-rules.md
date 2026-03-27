# Multi-agent collaboration rules (Productization MVP)

This doc formalizes the **minimal default multi-agent mode** for A2A.

Goals:
- deterministic and replayable
- minimal role system (only two roles)
- avoid two agents racing the same action
- align with existing runner + skill verbs (no new APIs)

Non-goals:
- distributed locks
- complex schedulers
- AI negotiation

---

## Roles

### 1) Worker

Default responsibilities:
- Create / work on **child tasks** under a coordination parent task.
- Draft deliverables:
  - `PUT /api/tasks/{id}/deliverable`
  - `POST /api/tasks/{id}/deliverable/submit`
- Handle revisions deterministically when `revision_requested`:
  - read `deliverable.revisionNote`
  - append a deterministic patch to `summaryMd`
  - resubmit
- Set or clear **self-owned blockers** when necessary:
  - `POST /api/tasks/{id}/block` (set/clear)

Must NOT do by default:
- Perform review decisions (`deliverable.review`) unless it is operating in reviewer role.

### 2) Reviewer / Coordinator

Default responsibilities:
- Read **attention** from the parent coordination task and pick the top item.
- Read task + events to explain *why* something needs attention.
- Perform review decisions for `awaiting_review`:
  - `POST /api/tasks/{id}/deliverable/review` (accept or request_changes)
- Clear or update blockers when acting as the coordinator (especially if worker is blocked).
- Low-frequency decisions (e.g. which child task to prioritize) based on attention + events.

Must NOT do by default:
- Edit worker deliverable contents (`PUT /deliverable`) except for deterministic, explicitly-owned coordinator patches (avoid by default).

---

## Deterministic priority order (attention)

When multiple attention items exist, the coordinator picks the top item by this order:

1) `blocked`
2) `revision_requested`
3) `awaiting_review`

Rationale:
- unblock progress first
- then address explicit requested changes
- then finalize by reviewing submitted work

---

## Default action mapping (by attention type)

### `blocked`

Default actor: **worker** (self-unblock) OR **reviewer/coordinator** (if unblock is external)

- Minimal default: clear blocker when safe and clearly owned:
  - `POST /api/tasks/{id}/block` `{ isBlocked:false }`

### `revision_requested`

Default actor: **worker**

- `GET /deliverable` to read `revisionNote`
- deterministic patch to `summaryMd`
- `PUT /deliverable` + `POST /deliverable/submit`

### `awaiting_review`

Default actor: **reviewer/coordinator**

- `GET /deliverable`
- Only proceed if `deliverable.status == submitted`
- `POST /deliverable/review` with decision (default: accept)

---

## Multi-agent dedupe rules (minimal, no locks)

The system avoids races primarily using:
- **role boundaries** (who is allowed to do what by default)
- **signatures** (taskId + event signatures)
- **per-agent state** (`state.json` in the runner)

### 1) Role boundary rules

1. Worker does NOT do reviewer actions.
2. Reviewer does NOT edit worker deliverable contents.
3. Coordinator owns reading attention and choosing the top work item.

### 2) Signature-based dedupe

- Same deliverable submission MUST NOT be reviewed twice.
  - signature: `taskId + submittedAt` (or fallback `status:<status>`)
- Same revision note MUST NOT be revised+resubmitted twice.
  - signature: `taskId + normalize(revisionNote)`

### 3) Who handles the same attention item first

- If both agents see the same parent attention list:
  - Only the **reviewer/coordinator** should act on `awaiting_review`.
  - Only the **worker** should act on `revision_requested`.
  - `blocked` is resolved by the agent that can safely clear it (prefer the agent that set it / owns the task).

### 4) Blocker ownership

- Worker may set blockers to communicate “cannot proceed”.
- Coordinator may clear blockers when the external dependency is resolved.
- Avoid both sides toggling blocker repeatedly; treat blocker changes as deliberate state transitions.

---

## Shared fact surface: default usage

### attention
- Primary shared queue for coordination.
- Coordinator reads it every loop.
- Worker typically does NOT read attention directly in productized mode (unless running as coordinator).

### coordination feed
- Used to confirm that a state transition happened (e.g. review accepted, invite responded).
- Coordinator uses it as a sanity check to avoid duplicate actions.

### task + events
- Used for replayability and explanation.
- Coordinator reads events before taking a side-effectful action.

### deliverable
- Worker writes drafts/submissions.
- Coordinator reads it for review decisions.

### reviewNote (revisionNote)
- Written by reviewer/coordinator when requesting changes.
- Consumed by worker deterministically (normalize + patch + resubmit).

### blocker
- Used as a coarse “stop signal”.
- Worker sets when truly blocked; coordinator clears when resolved.

---

## Alignment with existing runner

- Single-agent runner already implements:
  - priority order: `blocked > revision_requested > awaiting_review`
  - revision flow: deterministic revise + resubmit
  - review flow: deterministic accept policy (only when submitted)
  - dedupe state: `state.json`

This doc defines how to split those actions across two agents without adding new APIs or orchestration.
