# P19-3 Command & field alignment（MVP）

目标：
把 alignment 从「路径/关键词/部分语义」推进到更接近「命令级 + 字段级」只读约束，减少“看似对齐、实际执行口径写松”的漂移。

---

## 1) 新增命令级检查（只读）

在 `scripts/p17_3_alignment_check.mjs`：
- run name：REQUIRED_RUNS item 的 `name` 在 checklist 中是否可见（粗粒度）
- command keyword presence（checklist）：
  - `p7_2_gate_mvp.sh`
  - `p7_3_signal_to_action.mjs`
  - `--change-type`
- command string presence（checklist）：REQUIRED_RUNS item 的 `command` 是否被 checklist 命中（粗粒度 containsAny）

---

## 2) 新增字段级检查（只读）

对高价值 changeType（selection/runner/same_role/gate_rule）：
- 通用发布字段名是否在 checklist 中出现：
  - `releaseReadiness`
  - `releaseBlockingReasons`
  - `requiredRegressionsComplete`
  - `evidenceSufficiency`
  - `matrixDispositionOverride`
  - `dispositionReason`
- selection 字段名（selection_logic_change）：
  - `selection_case_present`
  - `Rsel*` / `selection_*` / `keyMetrics.selection`

---

## 3) 为什么这是 MVP

- 不做复杂 parser / 不做自动文档生成。
- 只做 deterministic 的“缺失/漂移提示”。
- 优先覆盖最影响发布治理落地的命令与字段。
