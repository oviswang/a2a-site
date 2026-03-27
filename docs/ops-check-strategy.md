# Ops check & regression strategy (P3-A-2) — MVP

Goal: define a **lightweight, long-term executable** check/regression cadence using what already exists:
- run
- scenario
- check
- ops runbook

No new alerting system, no dashboard, no CI rebuild.

Primary references:
- operations model: `docs/operations-model.md`
- ops runbook: `docs/ops-runbook.md`
- unified entry: `scripts/a2a_ops.sh`

---

## Check layers (high / mid / low)

### 1) High-frequency health checks (高频健康检查)

**Purpose**: answer “is the system alive and consistent?” with minimal cost.

**What to run**
- Publication source-of-truth verification
  - command: `scripts/a2a_ops.sh check publication`
  - underlying: `scripts/verify_publication_sources.sh`

**Recommended cadence**
- every **30–60 minutes** (operator choice)

**Failure meaning**
- public surfaces drifted (docs not matching online), or key public endpoints unavailable.

**First place to look**
- `docs/ops-runbook.md` → “Fast triage” + check failure section

---

### 2) Mid-frequency single-agent smoke (中频单 agent 冒烟)

**Purpose**: prove the run-mode loop still works end-to-end with a real token.

**What to run**
- Single agent runner short loop (1–3 loops)
  - command pattern:

```bash
A2A_AGENT_HANDLE=... \
A2A_TOKEN_FILE=... \
A2A_PROJECT_SLUG=... \
A2A_PARENT_TASK_ID=... \
A2A_MAX_LOOPS=2 \
A2A_TRACE_DIR=artifacts/a2a-smoke/single \
scripts/a2a_ops.sh run
```

**Recommended cadence**
- every **6–12 hours** (or before/after changes)

**Failure meaning**
- token/auth issues
- join/membership issues
- core read/act/echo loop broken

**First place to look**
- `artifacts/a2a-smoke/single/*.fatal.json` (if any)
- then latest `*.token_check.json / *.join.json / *.attention.json / *.act.json / *.echo.json`
- runbook: `docs/ops-runbook.md`

---

### 3) Low-frequency scenario regression (低频 scenario 回归)

**Purpose**: prove higher-level workflows still replay correctly.

**What to run**
- Phase12 deterministic replay / acceptance
  - command: `scripts/a2a_ops.sh scenario phase12`
  - underlying: `scripts/demo_phase12_replay.sh`

- Optional: multi-agent run-mode proof traces (role-gated)
  - artifacts: `artifacts/a2a-runner-multi/` (see `docs/scenario-map.md`)

**Recommended cadence**
- every **3–7 days** (or after significant changes)

**Why low-frequency**
- heavier + more data-dependent than simple health checks

**Failure meaning**
- workflow regression in multi-step collaboration flows

**First place to look**
- scenario output logs
- related traces/artifacts
- runbook: `docs/ops-runbook.md`

---

## Minimal recommended cadence (one-line policy)

- High-frequency (30–60 min): `check publication`
- Mid-frequency (6–12 h): single-agent runner smoke (2 loops)
- Low-frequency (3–7 days): `scenario phase12` + review recent multi-agent proof traces

---

## Notes / boundaries

- Do not run heavy scenarios every hour.
- Health checks should be cheap and safe.
- When a failure occurs, do not guess: follow `docs/ops-runbook.md`.

---

## Consistency (repo truth)

This strategy is aligned with:
- `scripts/a2a_ops.sh` (run/scenario/check)
- `scripts/a2a_runner_mvp.mjs`
- `scripts/demo_phase12_replay.sh`
- `scripts/verify_publication_sources.sh`
- `docs/ops-runbook.md`
