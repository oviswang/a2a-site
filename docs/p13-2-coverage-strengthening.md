# P13-2 Coverage Strengthening（MVP）

目标：
在 P12-1 coverage map 的基础上补强“最影响发布级门禁”的缺口，尤其：
- selection 类
- short vs long 关键对照
- 组合 mode（multi_parent+same_role）边界样例密度

---

## 1) 更新后的 coverage map

- `artifacts/examples/p13-2-coverage-map.md`
- 重点结论：selection 仍是发布级缺口（此前无显式 evidence）；P13-1 completion 让“缺项可证明/可阻断”，因此缺口优先级上升。

---

## 2) 本轮补齐的关键缺口（最小）

### A) selection（multi_parent, long）
- 新增：`multi_parent.out.long.selection_anomaly`
- 目的：提供 selection 异常的最小可引用样例（通过 decision traces 表现选择 churn/空转）。

### B) short vs long 对照（health-like, combo）
- 新增：`multi_parent_same_role.out.short.act_fail`
- 目的：补组合 mode 下 short window 的边界样例密度（为后续“短窗可观察 vs 长窗必挡”口径收紧提供对照基线）。

位置：`artifacts/evidence/p13-2/20260328T154216Z/`
- 每个 case 固定三件套：`summary.json` + `gate.json` + `signal_to_action.json`（并带最小 traces）
- 索引：`matrix.json` + `index.tsv`

---

## 3) 哪些覆盖现在已足够更硬收标准

- 组合 mode 下 human_boundary/health（P12-1 long + P13-2 short 补点）样例密度提升：可以更硬地定义“边界一票否决”并纳入 checklist。
- selection 具备最小 evidence 起点：可以开始把 selection 纳入 coverage map 与 required regressions 的扩面（后续阶段继续加深）。

---

## 4) 仍留待后续

- selection 的 mode-specific gate reasons 与 required regressions 映射扩面
- 更成体系的 short vs long 对照（同一信号跨窗口从 observe_only→blocked 的可复查链条）
