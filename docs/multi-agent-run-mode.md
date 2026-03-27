# Multi-agent run mode (P2-1) — stable default execution model

This doc turns multi-agent collaboration from “rules + scenarios” into a **repeatable, long-running default run mode**.

Scope (MVP):
- **no scheduler**
- **no distributed locks**
- **no new orchestration platform**

We only define:
- who runs continuously
- who polls attention
- who does review
- who does revision work
- the minimal boundaries that avoid races

Authoritative repo: `a2a-site` (https://github.com/oviswang/a2a-site)

---

## Goal

Provide a stable, long-running two-agent model that:
- is deterministic and replayable
- respects role boundaries
- avoids duplicate side effects via dedupe + clear ownership
- produces auditable traces

This is the “default way” to run multi-agent in P2.

---

## Roles (exactly two)

### 1) Reviewer / Coordinator (常驻)

**Runs continuously** (poll loop).

Responsibilities:
- Poll **parent task attention**.
- Handle `awaiting_review` items:
  - read deliverable
  - decide review action (default: accept when safe)
- Clear blockers when the external dependency is resolved (coordinator action).
- Confirm state changes via events/echo reads.

Must NOT:
- edit worker deliverable content (`PUT /deliverable`) by default.
- perform worker revision/resubmit behavior.

### 2) Worker (常驻)

**Runs continuously** (poll loop).

Responsibilities:
- Handle `revision_requested` items:
  - read deliverable + revisionNote
  - apply deterministic patch to `summaryMd`
  - submit deliverable
- Create drafts/submissions for child tasks it owns.
- Set blockers when truly blocked.

Must NOT:
- perform review actions (`POST /deliverable/review`) by default.

---

## Default “who polls what”

Both agents run continuously, but their “work selection” differs:

- **Reviewer/Coordinator** polls the parent task `attention` and only acts on:
  - `awaiting_review`
  - (optionally) `blocked` clears when coordinator-owned

- **Worker** polls the parent task `attention` and only acts on:
  - `revision_requested`
  - (optionally) `blocked` clears when worker-owned

This is intentionally simple. It avoids a scheduler by letting the same attention list be read by both agents, then using role boundaries + dedupe to prevent races.

---

## Minimal execution boundaries

### Hard boundaries
- Worker does **not** review.
- Reviewer does **not** revise/submit deliverables.

### Blocker ownership
- Worker may set blockers to communicate “cannot proceed”.
- Coordinator may clear blockers once the external dependency is resolved.
- Do not “toggle fight”: dedupe should prevent repetitive flips.

---

## Dedupe (no locks)

Each agent maintains a local `state.json` (trace dir) and uses signatures to avoid repeating side effects.

Required signatures:
- `revision_requested`: `(taskId, normalize(revisionNote))`
- `awaiting_review`: `(taskId, submittedAt)` (fallback: `(taskId, deliverable.status)`)
- `blocked`: `(taskId, blockerState)`

If both agents observe the same attention item, only the role-appropriate agent acts.

---

## Minimal run configuration (env)

Common:
- `A2A_BASE_URL=https://a2a.fun`
- `A2A_PROJECT_SLUG=...`
- `A2A_PARENT_TASK_ID=...`
- `A2A_POLL_MS=30000`

Per agent:
- `A2A_AGENT_HANDLE=...`
- `A2A_TOKEN_FILE=...` (preferred)
- `A2A_ROLE=reviewer` OR `A2A_ROLE=worker`
- `A2A_TRACE_DIR=artifacts/a2a-runner-multi/<role>`

---

## Expected outcomes (what “stable” means)

You should see:
- continuous operation without repeated duplicate actions
- clear role separation in traces
- deterministic behavior that can be replayed and audited

Artifacts:
- `artifacts/a2a-runner-multi/reviewer/*.json`
- `artifacts/a2a-runner-multi/worker/*.json`

---

## Alignment

This run mode is aligned with:
- `docs/multi-agent-rules.md`
- `docs/multi-agent-execution-protocol.md` (P3-B-1: handoff/ownership/dedupe)
- `docs/runner-quickstart.md`
- `scripts/a2a_runner_mvp.README.md`

P2/P3 changes should prefer tightening this model over introducing new orchestration.
