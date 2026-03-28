# P15-2 Selection coverage expansion（MVP）

目标：
把 selection 从“有 reason/rule/必跑项”推进到“问题类型更丰富、短长对照更清晰、规则更稳”的门禁域。

新增 evidence set：`artifacts/evidence/p15-2/20260328T162510Z/`

---

## 1) 新增 selection 问题类型（MVP）

- `selection_instability`（新增）
  - 信号：parent_switch_count 高但 churn_rate 未达到 churn_high 的极端
  - 输出：gateReason=`selection_instability`（WARN），rule=`Rsel2:multi_parent:selection_instability`

- `wrong_parent_spinning`（作为 churn_high 变体样例）
  - 信号：长窗下 wait/handoff 高 + selection_churn 持续存在
  - 输出：仍走 churn_high（must_fix_first），用于说明“空转型 selection 问题”的长窗挡板

---

## 2) mode/window 对照（本轮最小覆盖）

- multi_parent short：`selection_churn_low`（selection_churn_present → observe_only）
- multi_parent long：`wrong_parent_spinning`（selection_churn_high → must_fix_first）
- multi_parent+same_role long：`selection_instability_mild`（Rsel2 → observe_only）

---

## 3) gate/rule/disposition 落地（本轮新增）

- 新增 gateReason：`selection_instability`（WARN）
- 新增 rule id：`Rsel2:multi_parent:selection_instability`
- disposition：observe_only（用于对照：不是所有 parent_switch 都必须挡）

---

## 4) 回归与 checklist 接入

- `docs/p11-3-required-regressions.md`：selection_logic_change 增加 instability 对照项（observe_only 必须保持）
- `docs/p12-release-checklist.md`：selection_logic_change 增加 instability 对照项
