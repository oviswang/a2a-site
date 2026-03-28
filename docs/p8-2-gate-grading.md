# P8-2 Gate Grading（PASS / WARN / FAIL，MVP）

目标：
把 `a2a-site` 的 stability gate 从 `pass/fail` 推进到更贴近长期运行决策的分级：
- `PASS`
- `WARN`
- `FAIL`

约束：
- deterministic
- 只基于现有 facts + P8-1 threshold catalog
- 不引入 AI 自由判断，不做复杂 SLA/平台

---

## 1) 分级语义

### PASS
- 语义：适合放入长期运行环境
- 判定：无 `fail` / `warn` / `info` reasons
- 输出：
  - `gateLevel=PASS`
  - `releaseDisposition=long_run_ok`
  - `SAFE_FOR_LONG_RUN=yes`

### WARN
- 语义：不建议直接视为长期稳定；可进入观察期/受控运行
- 判定：存在 `warn` 或 `info` reasons，但不存在 `fail` reasons
- 输出：
  - `gateLevel=WARN`
  - `releaseDisposition=observe_only`
  - `SAFE_FOR_LONG_RUN=yes`

### FAIL
- 语义：不适合放进长期运行环境；必须先修
- 判定：存在任意 `fail` reason
- 输出：
  - `gateLevel=FAIL`
  - `releaseDisposition=must_fix_first`
  - `SAFE_FOR_LONG_RUN=no`

---

## 2) reason 分级映射（MVP 默认）

> 以 `scripts/p7_2_gate_mvp.sh` 的 reasons 为准。

### FAIL（默认）
- `stuck`
- `degraded`
- `act_fail`
- `human_action_required`
- `same_role_owner_stale`
- `same_role_takeover`
- `attention_cost_high`

### WARN（默认）
- `same_role_yield_to_peer`（当超过阈值）
- `refresh_skip_low`

### INFO（默认）
- `no_summary_cost`（缺少 `summary.cost`，仍可跑但不能视为完全通过）

---

## 3) 与 P8-1 threshold catalog 的关系

- 所有阈值默认值与适用边界以 `docs/p8-1-threshold-catalog.md` 为基线。
- gate grading 只改变“放行语义表达”，不引入新的统计口径。

---

## 4) 为什么这是 MVP grading，而不是生产 SLA

- 当前分级以“可解释、可执行”为第一优先；默认仍偏保守。
- 后续可在不破坏 deterministic 的前提下，逐步引入：
  - 更细的窗口统计（比例/连续窗口）
  - 错误分类（偶发 vs 持续）
  - 与 action→validation 的更紧密联动（P8-3）
