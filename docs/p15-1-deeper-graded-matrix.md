# P15-1 Deeper graded matrix（changeType × mode × window × evidenceType，MVP）

目标：
把 P14-1 的粗分级推进为更细的矩阵门槛：

**changeType × mode × window × evidenceType**

产物：
- `artifacts/examples/p15-1-deeper-graded-matrix.json`

---

## 1) evidenceType（MVP）

- `long_window`：loops>=60 的证据
- `short_or_medium`：short/medium window
- `boundary_case_present`：存在 human_boundary/health 等发布级边界证据（例如 HUMAN_ACTION_REQUIRED、act_fail）
- `selection_case_present`：存在 selection anomaly evidence（selection_churn_high / Rsel*）

---

## 2) 最小矩阵门槛（MVP）

每个 cell 至少字段：
- `minEvidenceSufficiency`
- `allowObserveOnly`
- `requiresLongWindow`
- `requiresBoundaryEvidence`

当前优先落地的 changeType：
- refresh_cost_config
- runner_behavior_change
- selection_logic_change

要点：
- refresh_cost_config：multi_parent 下必须 long_window + out-of-range guardrail（边界）
- runner_behavior_change：single/short 可允许 partial→observe_only（仍要求 completion=true）
- selection_logic_change：multi_parent 下必须 long_window 且 selection_case_present

---

## 3) gate 最小接入（本轮）

在 `scripts/p7_2_gate_mvp.sh`：
- 继续用 `--change-type` 输入 changeType
- 关键分支（MVP）：
  - refresh_cost_config：partial 一律 blocked（保持高风险）
  - runner_behavior_change：partial 可 observe_only（单一 changeType 时）
  - selection_logic_change：若无 selection evidence（Rsel*/selection_churn_*）则 blocked

---

## 4) 为什么比 P14-1 更细

- P14-1 仅按 changeType 处理 partial；
- P15-1 引入 mode/window/evidenceType 作为门槛语言，并开始让 gate 对 selection evidence presence 做硬约束。
