# Baseline freeze（发布治理线）

Freeze date: 2026-03-28 (UTC)

## Baseline intent
- 从现在起，这条治理线进入**收束与可用化模式**。
- 默认不再拆 P21/P22…；只做 baseline 冻结、文档/Runbook 整理、使用手册、以及真实问题驱动的小修。

## Baseline version
- Baseline commit: TBD（见 git history，本文随提交固定）

## Baseline files（冻结口径）

### A2A skill API baseline (current usable baseline)
- `docs/skill-api-inventory.md`
- `docs/skill-api-gap-report.md`
- `docs/skill-api-contracts.md`
- `docs/skill-agent-action-map.md`
- `docs/skill-api-baseline-freeze.md`
- `docs/public/skill.md`
- `web/A2A_SKILL_MANIFEST.json`

### A2A UI oversight baseline (current usable baseline)
- `docs/ui-oversight-baseline-freeze.md`
- `docs/ui-oversight-audit.md`
- `docs/ui-oversight-gap-report.md`
- `docs/ui-oversight-priority-list.md`
- `docs/ui-search-first-audit-surface.md`
- `docs/ui-global-oversight-dashboard.md`
- `docs/ui-structured-timeline.md`
- Key oversight pages:
  - `/projects/[slug]`
  - `/tasks/[id]`
  - `/proposals/[id]/review`
  - `/inbox`
  - `/dashboard`

### Core executors / fact sources
- `scripts/p7_2_gate_mvp.sh`（gate 计算 + matrix-first/table-driven 判定）
- `scripts/p13_1_regression_completion.mjs`（REQUIRED_RUNS single source of truth）
- `scripts/p17_3_alignment_check.mjs`（alignment/consistency check：命令/字段 + required 弱化检测）

### Matrix policy baseline
- `artifacts/examples/p17-1-deeper-graded-matrix.json`（table-driven matrix cells 基线）

### Selection evidence baselines
- `artifacts/evidence/p19-2/*`（selection midstate density baseline）
- `artifacts/evidence/p20-2/*`（selection midstate hardening baseline）

### Release docs baselines
- `docs/p11-3-required-regressions.md`
- `docs/p12-release-checklist.md`
- `docs/p20-conclusion.md`（阶段定稿与 freeze policy）

## Baseline boundary
- 以上内容视为“当前正式口径”。
- 后续变更必须满足至少一条：
  1) 影响 baseline 正确性
  2) 来自真实使用中的问题
  3) 不改会影响发布判断/可操作性

## Allowed change policy
- 默认只接受两类改动：
  - 真实使用暴露的问题（bugfix / gap-driven patch）
  - 会影响 baseline 正确性的缺口修补
- 若不满足上述条件，默认不做。
- 只有当真实使用暴露出“一整类系统性问题”时，才允许重新开大主题（但不以 P21/P22 的阶段化方式推进）。
