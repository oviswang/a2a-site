# P18-2 Selection boundary density（MVP）

目标：
把 selection 的边界态/中间态证据做得更细、更稳，减少灰区，使 table-driven gate 在 selection 上更可靠。

新增边界 evidence set：
- `artifacts/evidence/p18-2/20260328T180934Z/`

---

## 1) 本轮补齐的最值钱边界（MVP）

### A) parent_switch_count 高但 churn_rate 不极端（应 observe_only）
- case：`sel.boundary.long.switch_high_churn_low.observe`
- 目的：明确落在 Rsel2（observe_only）而非 Rsel1（must_fix_first）

### B) churn_rate 刚超过阈值（必须 must_fix_first）
- case：`sel.boundary.long.churn_just_over_threshold.block`
- 目的：为 Rsel1 边界提供“临界”证据点（避免只靠极端样例）

### C) short window 下的提示/观察
- case：`sel.boundary.short.instability_present.observe`
- 目的：强调 short 只做提示/观察，不替代 long-window 的 Rsel1/Rsel2 发布级结论

### D) combo mode 对照（同指标在 combo 下仍保持 observe_only）
- case：`sel.boundary.combo.long.switch_high_churn_low.observe`

---

## 2) 对 Rsel 层次的支撑

- Rsel2（observe_only）：新增 switch_high_churn_low 的 long 边界点（multi_parent 与 combo 各 1）
- Rsel1（must_fix_first）：新增 churn_just_over_threshold 的 long 临界点

---

## 3) evidence 索引增强

- `matrix.json`：包含 `problemType` / `supportsRule` / `selectionMetrics` / mode/window
- `index.tsv`：包含 selection_churn_rate / parent_switch_count 的快速检索列

---

## 4) 对 table-driven gate 的帮助

- table-driven 判断 `selection_case_present` 时，不再只有单点样例：
  - 可从 index/matrix 快速定位“为什么是 observe_only（Rsel2）”与“为什么是 must_fix_first（Rsel1）”。
