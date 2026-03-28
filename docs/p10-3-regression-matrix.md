# P10-3 Regression Matrix（扩面，MVP）

目标：
把 validation workflow 从“若干模板”推进为更系统的回归矩阵：

**问题类型 × 动作类型 × 验证方式**

约束：
- deterministic
- 不做回归平台
- 复用现有入口（gate / benchmark / short_smoke / inspect）

---

## 1) 最小回归矩阵（MVP）

> 入口：
> - `scripts/p7_2_gate_mvp.sh --dir <traceDir>`（gate / matrix / windowedMetrics）
> - `node scripts/p7_3_signal_to_action.mjs <gate.json>`（recommendedActions + validationWorkflow）
> - `scripts/p7_1_benchmark_mvp.sh`（cost/refresh 对比）

### A) cost（multi_parent 优先）
- 问题：attention cost 过高（`attention_cost_high` / `attention_req_per_parent` 高）
  - 推荐动作：调 `A2A_PARENT_REFRESH_MS/SMALL_ALL/RR_K`
  - 必跑验证：
    - gate（after）：gateLevel 改善；cost-related reasons 减少
    - benchmark：attention 下降；skippedByFreshCache 上升

- 问题：refresh 不省（`refresh_skip_low`）
  - 推荐动作：确认 refresh_ms>0 + cache warm + traceDir 复用
  - 必跑验证：
    - summary.cost.refreshPlan.skippedByFreshCache 变为非 0
    - gate reasons `refresh_skip_low` 消失或降级

### B) coordination（same_role 优先）
- 问题：yield_to_peer 过高（`same_role_yield_to_peer`，yield_rate 高）
  - 推荐动作：调 `A2A_YIELD_WINDOW_MS`；减少实例；校验 handles
  - 必跑验证：
    - gate（same_role）：yield reasons 降低；rule id 从 yield_rate_high 退出
    - short_smoke（>=5 loops）：yield_rate 降低

- 问题：owner_stale / takeover（`same_role_owner_stale` / `same_role_takeover`）
  - 推荐动作：调 `A2A_OWNER_STALE_MS`；减少实例
  - 必跑验证：
    - gate：owner_stale/takeover reasons 下降至 0
    - short_smoke：decision reasonCode 频率下降

### C) health
- 问题：stuck（summary.health=stuck）
  - 推荐动作：先救 stuck parent；减少重复实例
  - 必跑验证：
    - gate：stuck/degraded reasons 消失
    - summary.health 从 stuck → ok/degraded

- 问题：degraded（summary.health=degraded）
  - 推荐动作：定位 act_fail/HUMAN；修根因
  - 必跑验证：
    - summary.counts.act_fail / HUMAN_ACTION_REQUIRED 归零
    - gateLevel 改善（FAIL→WARN→PASS）

### D) human_boundary
- 问题：HUMAN_ACTION_REQUIRED
  - 推荐动作：停手→人工处理→短 smoke
  - 必跑验证：
    - gate reasons `human_action_required` 归零
    - SAFE_FOR_LONG_RUN=yes

### E) selection（multi_parent）
- 问题：parent selection 异常 / 错 parent 空转（常体现为 handoff/wait 高 + perParent 信号）
  - 推荐动作：修 parent ids / role boundary；缩小 parents 集合验证
  - 必跑验证：
    - summary.perParent 健康改善；handoff_ratio/wait_ratio 下降
    - gateLevel 改善

---

## 2) 如何使用（最短路径）

1) 先 gate：`scripts/p7_2_gate_mvp.sh --dir <traceDir>`
2) 再 action+workflow：`node scripts/p7_3_signal_to_action.mjs <gate.json>`
3) 按本矩阵选择“必跑验证方式”并记录 before/after：
- gateLevel / releaseDisposition
- windowedMetrics（ratio）
- summary.cost（cost）

---

## 3) 与 evidence matrix / deep gate matrix 的关系

- evidence matrix（P10-1）提供可复跑对照样本。
- deep gate matrix（P10-2）提供 window/ratio 指标与 rule id，作为回归对比锚点。
