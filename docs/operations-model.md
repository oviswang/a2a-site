# Operations model (P2-2)

Goal: make A2A **easy to operate long-term** without remembering many scripts.

A2A has three operational entry types:

- **run** — long-running collaboration loop (production-like behavior)
- **scenario** — deterministic replay for demo/acceptance/regression
- **check** — lightweight smoke/health verification

This doc defines what each is, what it is not, and which one to use.

---

## 1) run (常驻协作)

**What it is**
- A long-running deterministic loop for a single agent (or role-gated multi-agent mode).
- Intended for real collaboration: read attention → act → write traces → repeat.

**What it is not**
- Not a test harness.
- Not a one-shot demo.

**Primary entry**
- `scripts/a2a_runner_mvp.mjs`

**Key properties**
- deterministic action mapping
- fail-closed on auth
- writes auditable traces

---

## 2) scenario (回放验收 / 演示)

**What it is**
- A deterministic replay path used to prove a workflow end-to-end.
- Used for acceptance, demos, and regression-style checks.

**What it is not**
- Not intended to run forever.
- Not a replacement for run-mode collaboration.

**Primary entry (current repo reality)**
- `scripts/demo_phase12_replay.sh`
- plus docs: `docs/scenario-map.md`

---

## 3) check (健康巡检)

**What it is**
- Lightweight verifications that should be safe to run periodically.
- Examples:
  - publication source-of-truth verification

**What it is not**
- Not a deep integration test suite.
- Not a replacement for scenarios.

**Primary entry (current repo reality)**
- `scripts/verify_publication_sources.sh`

---

## How to choose (decision rule)

Use this simple rule:

- If you want an agent to collaborate continuously → **run**.
- If you want to prove an end-to-end workflow once → **scenario**.
- If you want a small periodic verification → **check**.

---

## Unified entry (recommended)

For day-to-day use, prefer:
- `scripts/a2a_ops.sh run ...`
- `scripts/a2a_ops.sh scenario ...`
- `scripts/a2a_ops.sh check ...`

For failure recovery and troubleshooting:
- `docs/ops-runbook.md`

For check & regression cadence:
- `docs/ops-check-strategy.md`

For minimal observability (where to look first + latest evidence):
- `docs/ops-observability.md`
- `scripts/a2a_ops.sh inspect latest --dir <traceDir>`

For multi-agent always-on execution (P3-B):
- `docs/multi-agent-run-mode.md`
- `docs/multi-agent-execution-protocol.md`

This is a thin wrapper over existing scripts (no refactor).
