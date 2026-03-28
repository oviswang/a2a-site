# Release-ready usage guide（baseline usage）

目标：用现有 baseline，完成一次发布前检查与判定（不讲阶段史）。

---

## 0) 你需要准备什么
- 一个 evidence 目录（例如：`artifacts/evidence/<...>/cases/<caseId>/`，包含 `summary.json` 与若干 `*.decision.json`）
- 本次变更的 `changeType`

---

## 1) 发布前先确认什么
- `changeType` 是否明确（见 checklist 与 REQUIRED_RUNS 的分类）
- evidence 是否足够：short/medium/long 的 window 语义是否满足（long 的门槛最关键）

---

## 2) changeType 怎么确定
- 以“你改动的治理风险面”为准（runner / same_role / selection / gate_rule / refresh_cost）。
- 如果不确定：优先选择更严格的 changeType（宁可 observe_only/blocked，不要误判 ready）。

---

## 3) completion 怎么生成 / 怎么检查
- 生成 completion：
  - `node scripts/p13_1_regression_completion.mjs --release-id <id> --change-type <ct> --gate <path-to-gate.json>`
  - 产物路径会输出为 `artifacts/regressions/<id>/completion.json`
- completion 要求：
  - `requiredRegressionsComplete=true` 才允许进入非硬阻断的 ready/observe_only 讨论

---

## 4) gate 怎么跑（带 table-driven 诊断）
- 跑 gate：
  - `./scripts/p7_2_gate_mvp.sh --dir <caseDir> --regressions <completion.json> --change-type <ct> > gate.json`
- 跑 action（可选）：
  - `node scripts/p7_3_signal_to_action.mjs gate.json > signal_to_action.json`

---

## 5) 结果怎么读
重点看 `gate.json`：
- `releaseReadiness`: `ready | observe_only | blocked`
- `releaseBlockingReasons`: 为什么 blocked（例如 required_regressions_incomplete / boundary_evidence_missing / deep_policy...）
- `tableDriven`（matrix-primary 诊断）：
  - `derivedInputs`（ct/mode/window/evidenceType）
  - `matchedCell`（匹配到的 cell）
  - `finalAppliedDecision`（门槛：requiresLongWindow/requiresBoundaryEvidence/allowObserveOnly）
  - `why`（本次 readiness 的主因说明）

硬阻断永远优先：HUMAN/act_fail/degraded/stuck/deep_policy/must_fix_first/required_regressions_incomplete。

---

## 6) checklist 怎么用
- 操作入口：`docs/p12-release-checklist.md`
- REQUIRED 项以 `scripts/p13_1_regression_completion.mjs#REQUIRED_RUNS` 为事实源（不可写弱）。

---

## 7) 常见 changeType 怎么看（快速指引）
- `selection_logic_change`
  - 重点看 selection evidence（Rsel/selection_*）与 selection midstate baselines（p19-2/p20-2 evidence）。
- `same_role_coordination_config`
  - 重点看 long-window + deep policy block case（yield_high 必须 remain blocked）。
- `gate_rule_change`
  - boundary evidence 要求更硬（缺 boundary 直接 blocked）。
- `refresh_cost_config`
  - matrix-primary 门槛更硬：short/medium 不能替代 long；并要求 boundary/guardrail。
- `runner_behavior_change`
  - 以 REQUIRED_RUNS 的 spot/contract checks 为准。

---

## 8) 失败/漂移时去哪里看
- alignment/consistency check：
  - `node scripts/p17_3_alignment_check.mjs`（输出在 `artifacts/examples/p17-3-alignment-check.json`）
  - 若报 drift（尤其 requiredWeakeningInChecklist / missingCommands / missingFields）：先修 docs/checklist 再继续发布。
- Runbook 入口：`docs/runbook-index.md`
- Ops：`docs/ops-runbook.md`

