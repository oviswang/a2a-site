# P16-3 Default required set alignment（MVP）

目标：
让 completion 映射、required regressions 文档、release checklist、gate 语义对“默认必跑集合”的理解更一致，减少漂移。

---

## 1) Single source of truth

- **默认必跑集合的事实源：** `scripts/p13_1_regression_completion.mjs` 中的 `REQUIRED_RUNS`。
- 其它出口（docs/checklist）应对齐引用 REQUIRED_RUNS（允许解释，但不应另起一套必跑集合）。

---

## 2) 本轮发现与修正的漂移点（MVP）

### runner_behavior_change
- 漂移：
  - 文档此前是“随机抽样 2–3 个 evidence cases”的描述，completion REQUIRED_RUNS 实际是固定 spot check（single.in.short.pass）。
- 修正：
  - `docs/p11-3-required-regressions.md` 改为与 REQUIRED_RUNS 一致的两条 spot 必跑（gate + signal_to_action）。

---

## 3) 当前已对齐的关键 changeType（MVP）

- selection_logic_change：
  - completion REQUIRED_RUNS 与 docs/checklist 已包含 anomaly guardrail + instability contrast + combo sanity。
- same_role_coordination_config / gate_rule_change / refresh_cost_config：
  - completion REQUIRED_RUNS 与 docs/checklist 均已包含对应必跑项（以 completion 为准）。

---

## 4) gate 语义与 regressions completeness

- gate 读取 completion（`--regressions`）后，`requiredRegressionsComplete` 是发布级硬门槛（缺项会 blocked）。
- 因此 REQUIRED_RUNS 的一致性是最关键的对齐对象。

---

## 5) 后续可继续做但本轮不做

- 自动生成 docs/checklist（避免人工同步成本）。
- 将 REQUIRED_RUNS 的 required/supplemental 显式分层。
