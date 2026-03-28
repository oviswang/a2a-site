# P20-3 Consistency hardening（MVP）

目标：
把一致性约束从“检查有没有”推进到“检查 required 是否被写弱/写松/写漂”。

---

## 1) required vs supplemental 最小分层

事实源：`scripts/p13_1_regression_completion.mjs#REQUIRED_RUNS`
- REQUIRED_RUNS 中的 item 视为 **required**（不可被降级为 optional/recommended）。
- checklist 可以额外列 **supplemental** 项，但不得与 required 混淆。

---

## 2) 弱化检测（deterministic，MVP）

在 alignment check 中：
- 对 required item 的 **name/command**，在 checklist 文本中做近邻窗口扫描。
- 若窗口内出现弱化词（如：optional/suggest/may/can/if needed/recommended/可选/推荐/如有需要/可考虑），则报告 drift：`requiredWeakeningInChecklist`。

---

## 3) 优先收紧的 changeType

- `selection_logic_change`
- `same_role_coordination_config`
- `gate_rule_change`
- `refresh_cost_config`
- `runner_behavior_change`

---

## 4) MVP 边界

- 不做 NLP，不做自动生成系统。
- 只做只读提示：尽早暴露 required 被写弱的风险点。
