# P8-3 Action → Validation Loop（MVP）

目标：
把 `recommendedActions[]` 从“该做什么”推进到“做完后看什么、怎么判定是否改善”。

约束：
- deterministic
- 不引入新 API / 不做自动修复
- 只基于现有 facts：summary / cost / gate / traces

---

## 1) 输出结构（脚本真相）

`node scripts/p7_3_signal_to_action.mjs <gate.json>` 输出中：
- `recommendedActions[].validationChecks[]`

每条 validationCheck（MVP）包含：
- `checkType`
- `targetField`
- `expectedChange`
- `evidencePathHint`
- `compareWindow`

---

## 2) 已覆盖的高频动作类型（MVP）

### A) refresh / cost 调参类
动作示例：`cost.attention.reduce`, `cost.refresh.not_working`
- 验证方式：
  - benchmark 对比 `summary.cost.requests.byStage.attention`（下降）
  - benchmark 对比 `summary.cost.refreshPlan.skippedByFreshCache`（上升）
  - graded gate `gateLevel`（改善；cost reasons 减少）

### B) same-role coordination 类
动作示例：`same_role.unstable`
- 验证方式：
  - graded gate reasons：`same_role_owner_stale` / `same_role_takeover` 下降至 0
  - decision reasonCode 频率：owner_stale/takeover 下降

### C) act_fail / HUMAN_ACTION_REQUIRED 恢复类
动作示例：`act_fail.recover`, `human_required.stop`
- 验证方式：
  - graded gate reasons：对应 fail reason 下降至 0
  - summary.counts：`act_fail` / `HUMAN_ACTION_REQUIRED` 下降（最好为 0）

### D) handoff / wait 过高类
动作示例：`handoff.high`, `wait.high`
- 验证方式：
  - summary ratio：handoff/windowLoops 或 wait/windowLoops 下降（低于 0.8）
  - graded gate level 改善

---

## 3) 为什么这是 MVP

- 先覆盖高频、可量化的验证字段（counts/cost/gateLevel）。
- 不引入复杂回归平台；复跑 benchmark/gate 即为最小验证回路。
- 后续可扩展：更细窗口口径、错误分类与更严格的“改善判定”。
