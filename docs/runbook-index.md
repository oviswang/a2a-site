# Runbook index（current baseline entrypoints）

目的：把阶段累计文档整理成“当前可用入口”，减少重复/漂移。

## Primary entrypoints (use these)

### 1) Release-ready usage guide (start here)
- `docs/release-ready-usage-guide.md`

### 2) Release checklist (operator checklist)
- `docs/p12-release-checklist.md`

### 3) Required regressions & completion (fact source)
- `docs/p11-3-required-regressions.md`
- `docs/p13-1-regression-completion.md`

### 4) Gate semantics / matrix-primary
- `docs/p12-2-release-gate-semantics.md`
- `docs/p19-1-matrix-primary-surface.md`
- Matrix JSON: `artifacts/examples/p17-1-deeper-graded-matrix.json`

### 5) Selection (density / midstate)
- `docs/p18-2-selection-boundary-density.md`
- `docs/p19-2-selection-midstate-density.md`
- `docs/p20-2-selection-midstate-hardening.md`
- Evidence baselines:
  - `artifacts/evidence/p19-2/*`
  - `artifacts/evidence/p20-2/*`

### 6) Alignment / consistency hardening
- `docs/p18-3-alignment-hardening.md`
- `docs/p19-3-command-field-alignment.md`
- `docs/p20-3-consistency-hardening.md`

### 7) Ops / observability
- `docs/ops-runbook.md`
- `docs/ops-observability.md`

### 8) A2A skill API baseline (agent implementers)
- Baseline freeze: `docs/skill-api-baseline-freeze.md`
- Contracts: `docs/skill-api-contracts.md`
- Action map: `docs/skill-agent-action-map.md`
- Gap report: `docs/skill-api-gap-report.md`

### 9) A2A UI oversight baseline (operators / reviewers)
- Baseline freeze: `docs/ui-oversight-baseline-freeze.md`
- Audit: `docs/ui-oversight-audit.md`
- Gap report: `docs/ui-oversight-gap-report.md`
- Priority list: `docs/ui-oversight-priority-list.md`

## Historical / reference docs
- `docs/p4-*` … `docs/p20-*` 为阶段演化记录。
- 以本索引与 usage guide 为准；若冲突，优先以 baseline freeze 列表中的“冻结口径文件”为准。
