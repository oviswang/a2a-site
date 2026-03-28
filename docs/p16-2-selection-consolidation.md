# P16-2 Selection domain consolidation（MVP）

目标：
把 selection 从“多条规则+一些样例”收敛为更清晰、可长期依赖的门禁域：
- 问题谱边界清楚
- Rsel 层次清楚
- evidence / gate / regressions / checklist 口径一致

---

## 1) selection 问题谱（MVP，按现有证据可判定）

### A) selection_churn_high（阻断型）
- 现象：长窗下 selection churn 持续且强（频率高/切换多）
- 典型 case：`multi_parent.out.long.selection_anomaly`
- 预期：`must_fix_first`（发布阻断）

### B) wrong_parent_spinning（空转型，阻断型）
- 现象：长窗下 wait/handoff 高，act_ok 低/为 0，且伴随 selection_churn（空转在错误 parent 上）
- 典型 case：`multi_parent.out.long.wrong_parent_spinning`
- 预期：阻断（当前归入 churn_high 族）

### C) selection_instability（漂移型，观察型）
- 现象：parent_switch 偏高，但 churn_rate 未达到极端（更像 drift/不稳而非持续 thrash）
- 典型 case：`multi_parent_same_role.out.long.selection_instability_mild`
- 预期：`observe_only`（用于“一挡一放”对照基线）

### D) selection_churn_present（提示型，观察型/短窗）
- 现象：短窗/低比例 churn 出现
- 典型 case：`multi_parent.out.short.selection_churn_low`
- 预期：`observe_only`

---

## 2) Rsel* 规则层次（MVP）

- **Rsel0: selection_churn_present**
  - 级别：WARN / observe_only
  - 适用：short/medium/long（但主要用于短窗提示）

- **Rsel2: selection_instability**
  - 级别：WARN / observe_only
  - 适用：long-window（loops>=60）
  - 作用：提供“switch 偏高但不必阻断”的稳定对照。

- **Rsel1: selection_churn_high**
  - 级别：FAIL / must_fix_first
  - 适用：long-window（loops>=60）
  - 作用：阻断持续性 thrash/错误选择导致的长期不稳。

> 注：wrong_parent_spinning 当前归入 Rsel1 家族（因为本质是长窗 churn + 空转）。

---

## 3) 统一口径（evidence / gate / regressions / checklist）

### evidence 命名
- selection anomaly（阻断）：`...selection_anomaly`
- selection instability（观察）：`...selection_instability_mild`
- short churn（提示）：`...selection_churn_low`

### gate 输出
- gateReasons：`selection_churn_high` / `selection_instability` / `selection_churn_present`
- matrixRuleId：`Rsel1` / `Rsel2` / `Rsel0`

### regressions / checklist（selection_logic_change）
- 默认必跑基线（至少三件套）：
  1) anomaly guardrail（必须 blocked）
  2) instability contrast（必须 observe_only）
  3) combo sanity（必须非 blocked）

### matrix evidenceType
- `selection_case_present`：出现 Rsel* 或 selection_* reasons 视为 selection evidence 存在。

---

## 4) long-window 要求

- Rsel1/Rsel2：必须 long-window 才成立（发布级）
- Rsel0：短窗提示（observe_only），不作为 release-ready 的唯一证据
