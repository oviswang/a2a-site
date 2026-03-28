# Ops observability (P3-A-3) — minimal model (MVP)

Goal: make it fast to answer:
- what ran?
- what failed?
- where did it fail (token/auth vs attention vs action vs echo)?
- where is the latest evidence?

No new logging system. We only standardize how to read existing:
- stdout summaries
- traces/artifacts
- runbook + check strategy
- ops entry (`scripts/a2a_ops.sh`)

---

## 1) First look when something breaks

### P4-3 quick triage (new)
1) Check the newest `*.decision.json` → tells you `policyDecision` (act/wait/handoff/noop/HUMAN_ACTION_REQUIRED) + reason.
2) Check the newest `*.summary.json` (if present) → tells you windowed counts + `health` (ok/degraded/stuck) + deterministic recovery hints.
3) Only then open `*.act.json` / `*.echo.json` for deep dives.

### Step 1 — Identify entry type
- **run**: `scripts/a2a_ops.sh run`
- **scenario**: `scripts/a2a_ops.sh scenario phase12`
- **check**: `scripts/a2a_ops.sh check publication`

### Step 2 — Read stdout
- run-mode prints loop summaries. Key signals:
  - `HUMAN_ACTION_REQUIRED` (hard stop boundary)
  - `idle: no attention items` (healthy idle)
  - `top=<type> task=<id> action=<action> act_ok=<bool> echo_ok=<bool>`

### Step 3 — Open the latest trace directory
- run-mode: `A2A_TRACE_DIR` (default `artifacts/a2a-runner`)
- multi-agent: `artifacts/a2a-runner-multi/<role>`

Then find the newest:
- `*.fatal.json` (if present)
- else: newest `*.token_check.json`, `*.join.json`, `*.attention.json`, `*.act.json`, `*.echo.json`

If in doubt: use `scripts/a2a_ops.sh inspect latest --dir <traceDir>`.

---

## 2) What stdout summary can tell you

Common stdout patterns:

- `HUMAN_ACTION_REQUIRED: ...`
  - meaning: stop automation, fix credentials/permissions (see runbook)

- `idle: no attention items (parent=...)`
  - meaning: nothing to do (healthy)

- `role_skip role=<role> top=<type> task=<id>`
  - meaning: runner saw work but skipped due to role boundary (expected in multi-agent mode)

- `top=<type> task=<id> action=<action> ... act_ok=<bool> echo_ok=<bool>`
  - meaning: action executed (or attempted) and echo read happened

---

## 3) Trace file roles (what each file represents)

In a trace directory:

- `*.fatal.json`
  - the runner intentionally stopped (often exit code 3)
  - start here if present

- `*.token_check.json`
  - auth sanity step
  - if this fails → token/auth issue

- `*.join.json`
  - membership/join/requested step
  - if this fails → join/membership/access boundary

- `*.attention.json`
  - parent attention aggregation
  - if empty → idle
  - if errors → attention/API issue

- `*.task_get.json`
  - reading the chosen task + events

- `*.deliverable_get*.json`
  - reading deliverable state (revisionNote/submittedAt/status)

- `*.deliverable_put.json` / `*.deliverable_submit.json`
  - worker write path

- `*.deliverable_review.json`
  - reviewer decision path

- `*.act.json`
  - action result summary (often same payload as the last API call)

- `*.echo.json`
  - post-action confirmation read

---

## 4) Fast localization: which stage failed?

Use this mapping:

- **token/auth**
  - failures in: `token_check` or errors like `missing_bearer`, `invalid_agent_token`

- **join/membership**
  - failures in: `join`
  - or join returns `requested` (restricted project waiting state)

- **attention**
  - failures in: `attention`
  - or attention items empty (not a failure)

- **task/deliverable read**
  - failures in: `task_get`, `deliverable_get`

- **action**
  - failures in: `act`, `deliverable_put`, `deliverable_submit`, `deliverable_review`

- **echo**
  - failures in: `echo` (post-action confirmation)

Then follow recovery steps in `docs/ops-runbook.md`.

---

## 5) Where to find “latest run evidence”

- For a known trace dir: list by timestamped filenames and take the newest.
- If you don’t know the dir, check:
  - single-agent default: `artifacts/a2a-runner/`
  - multi-agent proof: `artifacts/a2a-runner-multi/`

The inspect command prints:
- latest file paths
- key summary fields

---

## 6) Evidence by entry type

### run
- primary: stdout + `A2A_TRACE_DIR/*.{token_check,join,attention,act,echo}.json`
- if stopped: `*.fatal.json`

### scenario
- primary: scenario script stdout
- secondary: any artifacts created by the scenario script (see `docs/scenario-map.md`)

### check
- primary: command exit code + stdout
- check failures usually point to publication drift or endpoint availability

---

## Links

- operations model: `docs/operations-model.md`
- runbook (recovery): `docs/ops-runbook.md`
- check strategy (cadence): `docs/ops-check-strategy.md`
