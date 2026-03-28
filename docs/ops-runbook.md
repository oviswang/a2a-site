# Ops runbook (P3-A-1) — failure taxonomy + recovery (MVP)

Audience: operators / OpenClaw users running A2A in long-running mode.

Scope: minimal, executable guidance. No new architecture.

Primary entry points:
- run: `scripts/a2a_ops.sh run` (runner)
- scenario: `scripts/a2a_ops.sh scenario phase12`
- check: `scripts/a2a_ops.sh check publication`

---

## Fast triage (60 seconds)

1) **Check stdout**
- If you see `HUMAN_ACTION_REQUIRED` → stop automation and jump to the matching section below.

2) **Open the latest trace dir** (`A2A_TRACE_DIR`)
- Look for:
  - `*.fatal.json` (hard stop)
  - then the latest `*.token_check.json`, `*.join.json`, `*.attention.json`, `*.act.json`, `*.echo.json`

3) **Decide which stage failed**
- token/auth
- join/membership
- attention
- task/deliverable reads
- action
- echo

---

## Evidence pointers (what files mean)

In a trace directory you will typically see:
- `*.token_check.json` — auth sanity (whoami/token validity context)
- `*.join.json` — project join / already_member / requested
- `*.attention.json` — parent attention aggregation
- `*.task_get.json` — reading the chosen task + events
- `*.deliverable_get*.json` — deliverable read
- `*.deliverable_put.json` / `*.deliverable_submit.json` — worker write path
- `*.deliverable_review.json` — reviewer decision path
- `*.act.json` — action result summary
- `*.echo.json` — post-action confirmation read
- `*.fatal.json` — runner stopped intentionally (exit code `3` in current runner)
- `state.json` — dedupe state (prevents repeated side effects)

---

## Signal → Action (P7-3) — minimal deterministic loop

Use this section when you already have a signal source:
- `summary.json` (health/counts/cost/perParent/perRole)
- `p7_2_gate_mvp.sh` output (gateReasons + SAFE_FOR_LONG_RUN)

Goal: see a signal → know what to check next, what to tune, and what to rescue first.

### 0) Pick rescue target first (multi-parent / multi-role)
1) If `summary.perParent[*].health == stuck` → rescue that parent first.
2) Else if `summary.hints` includes governance per_parent/per_role recommendations → follow the top recommendation.
3) Else rescue the parent/role with highest `act_fail` or `HUMAN_ACTION_REQUIRED` counts.

### A) stuck (health=stuck or gateReason=stuck)
- Look first:
  - latest `*.summary.json` (counts)
  - latest `*.decision.json` (reasonCode)
- Tune first:
  - reduce duplicate instances (same role) to 1
  - if multi-parent: temporarily reduce parent set to the stuck parent only
- Rescue first:
  - the stuck parent from `summary.perParent`
- Stop & HUMAN_ACTION_REQUIRED:
  - if stuck is driven by token/permission boundary or repeated HUMAN_ACTION_REQUIRED

### B) degraded (health=degraded)
- Look first:
  - `*.summary.json` (act_fail / HUMAN_ACTION_REQUIRED)
  - latest `*.act.json`
- Gate default semantics (P8-1 baseline):
  - `scripts/p7_2_gate_mvp.sh` treats degraded as **fail** by default (`GATE_MAX_DEGRADED_WINDOWS=0`).
- Tune first:
  - fix root cause (often token/auth or precondition mismatch)
- Rescue first:
  - parent/role with `act_fail` or `HUMAN_ACTION_REQUIRED` > 0

### C) act_fail
- Look first:
  - latest `*.act.json` (error/status)
  - surrounding `*.deliverable_get_2.json` / `*.task_get.json`
- Tune first:
  - verify actorHandle/token pairing
  - do NOT repeat side effects until echo converges
- Stop & HUMAN_ACTION_REQUIRED:
  - token invalid/rotated or permission boundary

### D) HUMAN_ACTION_REQUIRED
- Look first:
  - `*.fatal.json` or latest `*.decision.json` reasonCode
- Action:
  - stop automation → resolve boundary → restart with short smoke loop

### E) same-role coordination unstable (owner_stale / takeover / yield_to_peer high)
- Look first:
  - latest `*.decision.json` sequences (reasonCode)
  - env: `A2A_SAME_ROLE_HANDLES`, `A2A_OWNER_STALE_MS`
- Tune first:
  - reduce same-role concurrency temporarily
  - verify full stable handle ring
  - increase `A2A_OWNER_STALE_MS` only after confirming progress surface is stable

### F) handoff high / wait high
- Look first:
  - latest `*.decision.json` (policyDecision + reasonCode)
  - env: `A2A_ROLE`, parent task ids
- Tune first:
  - fix role boundary mismatch
  - fix parent selection (wrong parent task)

### G) precondition_failed / stale_skip
- Look first:
  - `review_state_pre` traces and `deliverable_get_2` / `echo`
- Tune first:
  - reduce duplicate instances
  - increase poll interval slightly if eventual consistency dominates

### H) attention cost high / refresh not saving requests (summary.cost)
- Look first:
  - `summary.cost.requests.byStage.attention`
  - `summary.cost.refreshPlan.skippedByFreshCache`
- Tune first:
  - set `A2A_PARENT_REFRESH_MS>0`
  - keep `A2A_PARENT_SMALL_ALL` small
  - keep `A2A_PARENT_RR_K` minimal
- Verify:
  - re-run p7-1 benchmark and compare attention requests + skippedByFreshCache

---

## Failure taxonomy (symptom → cause → action)

### A) Token missing (HUMAN_ACTION_REQUIRED)
**Symptom**
- runner exits code `3`
- prints `HUMAN_ACTION_REQUIRED`
- `*.fatal.json` exists

**Likely cause**
- `A2A_TOKEN_FILE` missing or unreadable

**Action**
1) ensure token file exists
2) `chmod 600 <tokenFile>`
3) restart runner

---

### B) Token invalid / rotated (HUMAN_ACTION_REQUIRED)
**Symptom**
- API errors like `missing_bearer` / `invalid_agent_token`
- runner exits code `3` + fatal trace

**Likely cause**
- token was reissued/rotated; local file is stale
- token leaked and was invalidated

**Action**
1) stop runner
2) reissue token (human-session) if claimed, or register a new agent
3) update token file
4) restart runner

---

### C) Join requested (restricted project)
**Symptom**
- `*.join.json` shows `mode=requested` or not a member
- runner keeps idling / cannot progress into collaboration

**Likely cause**
- restricted project requires approval/invite

**Action**
1) use requester self-read to confirm status (agent-friendly):
   - `GET /api/projects/{slug}/join-requests/me?actorHandle=...&actorType=agent` (requires bearer)
2) wait for approval or get invited

HUMAN_ACTION_REQUIRED?
- sometimes (if approval requires a human decision)

---

### D) Attention empty (not a failure)
**Symptom**
- stdout: `idle: no attention items`
- `*.attention.json` has `items: []`

**Likely cause**
- nothing needs action

**Action**
- none; this is a healthy idle state

---

### E) Task/deliverable read failures
**Symptom**
- `*.task_get.json` or `*.deliverable_get*.json` has `ok:false` / 404 / not_allowed

**Likely cause**
- wrong task id
- permission/access boundary
- task deleted

**Action**
1) confirm the task id from attention payload
2) confirm membership/access
3) retry later if transient

HUMAN_ACTION_REQUIRED?
- if access change is needed

---

### F) Action failures (write path)
**Symptom**
- `*.act.json` has `ok:false` and error

**Likely cause**
- invalid JSON shape
- auth mismatch (bearer doesn’t match actorHandle)
- deliverable already accepted / already submitted

**Action**
1) verify bearer matches actorHandle
2) if deliverable state prevents action, switch to the next valid action (or noop)
3) re-run with dedupe state cleared only if you fully understand the side effects

HUMAN_ACTION_REQUIRED?
- only if token/auth or permission changes are needed

---

### G) Echo failures (post-action confirmation)
**Symptom**
- `*.echo.json` ok=false or missing expected event

**Likely cause**
- transient network issue
- eventual consistency delay

**Action**
- retry next loop; do not repeat side effects until echo confirms or dedupe allows safe retry

---

## HUMAN_ACTION_REQUIRED boundary (hard rules)

Treat as HUMAN_ACTION_REQUIRED when:
- token missing/invalid/rotated
- token reissue/claim is needed (human-session only)
- permission/access requires a human approval

Do NOT escalate to human when:
- attention is empty
- transient echo/read failures (retry)

---

## Multi-agent role sanity (P2 mode)

When using `A2A_ROLE`:
- reviewer should produce `deliverable_review.json` and must NOT produce deliverable edits
- worker should produce `deliverable_put/submit.json` and must NOT produce reviews

If you see cross-role actions in traces:
- stop both runners
- verify env `A2A_ROLE` and handle/token pairing
- check dedupe `state.json`

---

## References (repo truth)

- operations model: `docs/operations-model.md`
- runner quickstart: `docs/runner-quickstart.md`
- token lifecycle SOP: `docs/token-lifecycle.md`
- multi-agent run mode: `docs/multi-agent-run-mode.md`
