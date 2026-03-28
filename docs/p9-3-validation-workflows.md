# P9-3 Validation Workflows（工程化验证回路，MVP）

目标：
把 `validationChecks[]` 推进为更标准的工程回路：

**action → re-run → gate/check → compare → disposition**

约束：
- deterministic
- 不引入新 API / 不做回归平台
- 以现有命令为 re-run 单元（gate / benchmark / inspect / short runner loop）

---

## 1) 输出结构（脚本真相）

`node scripts/p7_3_signal_to_action.mjs <gate.json>` 输出中：
- `recommendedActions[].validationWorkflow[]`

每条 workflow（MVP）包含：
- `reRunCommand`
- `targetMetrics[]`
- `compareRule`
- `expectedOutcome`
- `passCondition`

---

## 2) 标准 workflow 模板（MVP）

### A) cost/refresh 调参（multi_parent）
- action：调 `A2A_PARENT_REFRESH_MS / A2A_PARENT_SMALL_ALL / A2A_PARENT_RR_K`
- re-run：
  - gate：`scripts/p7_2_gate_mvp.sh --dir <traceDir>`
  - bench：`scripts/p7_1_benchmark_mvp.sh`（refresh_ms=0 vs >0）
- compare：
  - `gateLevel` 改善（FAIL→WARN→PASS）
  - `summary.cost.requests.byStage.attention` 下降
  - `summary.cost.refreshPlan.skippedByFreshCache` 上升
- disposition：向 `long_run_ok` 收敛

### B) same-role coordination 调参（same_role）
- action：调 `A2A_SAME_ROLE_HANDLES / A2A_OWNER_STALE_MS / A2A_YIELD_WINDOW_MS`
- re-run：
  - gate on same-role traceDir
  - short same-role smoke（MAX_LOOPS>=5）
- compare：
  - `same_role_owner_stale/takeover` reasons 降至 0（或仅在真实 stale owner 时出现）
  - handoff/wait 不再持续性异常
- disposition：从 must_fix_first → observe_only/long_run_ok

---

## 3) 与 P9-1 / P9-2 的关系

- P9-1：workflow 中的调参范围应优先落在推荐区间内；超出推荐区间需要额外证据。
- P9-2：workflow 的 gate 解释以 `scenarioMode/matrixKey/signalClass` 为语义上下文。
