# P18-1 Matrix table-driven（MVP）

目标：
把 gate 从“主要靠手写分支”推进到“对少数高频 changeType 开始查表执行”的状态。

不做：复杂策略引擎。

---

## 1) 本轮切到查表的 changeType（MVP）

仅启用 table-driven 的 allowlist：
- `runner_behavior_change`
- `same_role_coordination_config`
- `selection_logic_change`

> 说明：当且仅当 `--change-type` 提供且只包含 1 个上述 changeType 时启用查表。

---

## 2) 查表输入（MVP 推断）

从 gate 结果推断：
- `changeType`：来自 `--change-type`
- `mode`：`results[0].scenarioMode`
- `window`：由 `results[0].windowedMetrics.loops` 映射 short/medium/long
- `evidenceType`（优先级）：
  1) `boundary_case_present`（存在 human/act_fail/degraded/stuck reasons）
  2) `selection_case_present`（存在 Rsel* 或 selection_* reasons）
  3) `long_window` / `short_or_medium`

---

## 3) 查表数据源（MVP 固定路径）

优先读取：
- `artifacts/examples/p17-1-deeper-graded-matrix.json`
- fallback：`artifacts/examples/p16-1-deeper-graded-matrix.json`

---

## 4) 优先级与不覆盖的硬阻断

硬阻断优先级更高（不被查表覆盖）：
- HUMAN / act_fail / degraded / stuck
- deep_policy must_fix_first
- gate_failed_or_must_fix_first
- requiredRegressionsComplete=false

查表只用于：
- 额外约束（requiresLongWindow / requiresBoundaryEvidence）
- 在 partial 下允许 observe_only（allowObserveOnly）

---

## 5) 输出

release 输出新增：
- `tableDriven.enabled`
- `tableDriven.matrixPath`
- `tableDriven.matchedCells[]`
- `tableDriven.decision`
