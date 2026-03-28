# P14-1 Graded thresholds（按 changeType/mode/window/regressions 分级，MVP）

目标：
把发布门禁从“一刀切硬标准”推进到**按 changeType 分级**的最小门槛体系。

输入与约束：
- completion 驱动：`requiredRegressionsComplete`
- gate 输出：`evidenceSufficiency`（MVP: long-window= sufficient；否则 partial）

产物：
- machine-readable：`artifacts/examples/p14-1-graded-thresholds.json`

---

## 1) MVP 分级门槛表（核心规则）

共通硬规则（继承 P13-3）：
- `requiredRegressionsComplete=false` → **blocked**（任何 changeType）

changeType 分级（MVP）：
- 必须 long-window 才允许 ready（partial 直接 blocked）：
  - `refresh_cost_config`
  - `gate_rule_change`
  - `same_role_coordination_config`
  - `selection_logic_change`
- partial evidence 允许 observe_only（不等于 ready）：
  - `runner_behavior_change`

---

## 2) gate 最小接入（changeType-aware）

- `scripts/p7_2_gate_mvp.sh` 新增 `--change-type <type>`（可重复）
- 若提供 changeType：
  - 按 `graded-thresholds.json` 决定 evidence=partial 时的 `releaseReadiness`：
    - high-risk changeType → blocked
    - runner_behavior_change → observe_only

---

## 3) 为什么是 MVP

- 先用 changeType 分级解决“一刀切”误伤；后续再扩展到 mode/window 细粒度矩阵。
