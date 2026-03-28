# P14-2 Selection gating（工程化，MVP）

目标：
把 selection 从“有样例/有 coverage”推进到“有专属信号/专属 gate reason/专属 rule id/专属回归要求”的正式门禁对象。

---

## 1) selection 最小门禁信号（MVP）

基于 decision traces（`*.decision.json`）：
- `selection_churn_rate`：reasonCode=`selection_churn` 的 decision 数 / loops
- `parent_switch_count`：在 selection_churn decision 中，chosenParent 的切换次数

辅助参考（与 selection 强相关）：
- `handoff_ratio`, `wait_ratio`（来自 windowedMetrics）

---

## 2) gate 落地（MVP）

适用：`scenarioMode=multi_parent` 且 long window（loops>=60）

新增 gate reasons：
- `selection_churn_high`（FAIL）
  - 条件：`selection_churn_rate>0.2` 或 `parent_switch_count>=10`
- `selection_churn_present`（WARN）
  - 条件：`selection_churn_rate>0.05`

新增 matrixRuleId：
- `Rsel1:multi_parent:selection_churn_high`
- `Rsel0:multi_parent:selection_churn_present`

处置（disposition）：
- churn_high → `must_fix_first`
- churn_present（低）→ `observe_only`

---

## 3) required regressions / checklist 接入

- `docs/p11-3-required-regressions.md`：selection_logic_change 增加 selection anomaly guardrail（long）必跑项
- `docs/p12-release-checklist.md`：selection_logic_change checklist 增加 selection anomaly guardrail 必跑项

---

## 4) 真实样例

- `artifacts/evidence/p13-2/20260328T154216Z/cases/multi_parent.out.long.selection_anomaly/gate.json`
  - 预期包含：selection gateReason + Rsel* rule id + selection metrics
