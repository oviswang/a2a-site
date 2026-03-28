# P20-1 Coverage expansion（MVP）

目标：
把 matrix / checklist / REQUIRED_RUNS 的高频灰区缺口做成更明确的 coverage 扩展，并补 1 个最值钱的 changeType 进入更稳定的 matrix-primary 覆盖。

---

## 1) gap report（本轮发现）

报告文件：`artifacts/examples/p20-1-gap-report.json`

最值钱缺口（top）：
- `selection_logic_change` 在 `multi_parent+same_role / long` 的 matrix cell 缺口（可能导致 fallback 语义与写松）
- `runner_behavior_change` 的 `single / short` 覆盖缺口（REQUIRED_RUNS 推断时 evidenceType=unknown，提示需要更明确的 cell/分类）

---

## 2) 本轮选择先补的 changeType

- `refresh_cost_config`

原因：
- 高频且容易被“写泛”；需要 matrix 给出明确门槛（requiresLongWindow / requiresBoundaryEvidence / allowObserveOnly）。
- 已存在部分 matrix cell，本轮将其纳入 gate 的 table-driven allowlist，使其进入更稳定的 matrix-primary 轨道。

---

## 3) 新增 coverage（本轮交付）

- gate allowlist 纳入：`refresh_cost_config`
- 样例输出：
  - `artifacts/examples/p20-1-sample.refresh_cost.long.matrix.json`
    - 显示：tableDriven.matchedCell + finalAppliedDecision + why

---

## 4) 灰区减少点

- refresh_cost_config 不再完全依赖手写分支/隐含约定：
  - readiness 门槛在无硬阻断时优先受 matrix 决策约束
  - tableDriven 输出可审计
