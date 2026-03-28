# P19-2 Selection midstate density（MVP）

目标：
把 selection 的“中间态/渐变态”证据做厚，减少 Rsel0/Rsel2/Rsel1 之间灰区，使 matrix 主判定层在 selection 上更可靠。

新增 evidence set：`artifacts/evidence/p19-2/20260328T183452Z/`

---

## 1) 本轮补齐的渐变链条（MVP）

### A) switch_high_churn_low 渐变（同一现象跨 short/medium/long）
- short（prompt）：`sel.midstate.short.switch_high_churn_low.prompt`
- medium（observe）：`sel.midstate.medium.switch_high_churn_low.observe`
- long（observe / Rsel2）：`sel.midstate.long.switch_high_churn_low.observe`

目的：让“switch 高但 churn 不极端”稳定落在观察层（Rsel2），而不会漂到阻断层（Rsel1）。

### B) churn 渐变（long 观察 → 临界阻断）
- long（observe / 中等 churn）：`sel.midstate.long.churn_medium.observe`
- long（block / just-over-threshold）：`sel.midstate.long.churn_just_over_threshold.block`

目的：把 Rsel2→Rsel1 的跨越边界用证据点钉住（不只靠极端样例）。

### C) combo medium 对照
- medium combo（observe）：`sel.midstate.medium.combo.instability.observe`

---

## 2) 复用的 Rsel 体系（无新增规则）

- short/medium 的轻微 churn 仍表现为提示/观察（Rsel0 语义）
- long 的中间态落入 Rsel2（observe_only）
- 临界越界进入 Rsel1（must_fix_first）

---

## 3) 索引增强（表达中间态）

- `matrix.json`：包含 problemType/supportsRule/selectionMetrics/windowClass/mode
- `index.tsv`：新增列
  - `boundaryBand`（prompt/observe/block）
  - selection_churn_rate / parent_switch_count
  - ruleId / reasons

---

## 4) 对 matrix 主判定层的帮助

- 同一现象跨 window 的链条让 table-driven `selection_case_present` 更可解释：
  - short/medium 只能 observe/prompt
  - long 才能稳定落入 Rsel2/Rsel1 的发布级结论
