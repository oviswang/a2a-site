# P7-2：Stability Gates（MVP）

目标：
把“是否可以放进长期运行环境”从人工看 traces，收敛为一个**最小、可执行、可解释**的门禁层。

约束：
- deterministic
- 只基于现有事实面：`summary.json` / `decision.json` / `health` / `counts` / `conflict codes` / `cost`
- 不做 CI/告警平台，不引入 AI 自由判断

---

## 1) 输入与证据

门禁输入（traceDir）：
- 优先：最新 `*.summary.json`（包含 `health` / `counts` / `cost`）
- 补充证据：最新 `*.decision.json` / `*.act.json` / `*.echo.json`

若缺少 summary（或 summary.cost），门禁仍可运行，但会给出 warning（因为无法做 cost sanity gate）。

---

## 2) 门禁项（MVP）

### Gate A: stuck 门禁
- 判定依据：`summary.health == stuck`
- MVP 规则：出现即 fail（`GATE_MAX_STUCK_WINDOWS=0`）
- 解释：stuck 表示持续空转且无 act_ok/wait 进展，默认不允许进入长期运行。

### Gate B: act_fail 门禁
- 判定依据：`summary.counts.act_fail`
- MVP 规则：`act_fail > 0` 即 fail（`GATE_MAX_ACT_FAIL=0`）
- 解释：先严后松；后续可按“偶发 vs 持续”在 P7-3 中基于窗口与错误码细化。

### Gate C: HUMAN_ACTION_REQUIRED 门禁
- 判定依据：`summary.counts.HUMAN_ACTION_REQUIRED`
- MVP 规则：`HUMAN_ACTION_REQUIRED > 0` 即 fail（`GATE_MAX_HUMAN_REQUIRED=0`）
- 解释：长期运行环境应避免需要人工介入的硬停边界。

### Gate D: same-role coordination 门禁
- 判定依据：`decision.reasonCode` 统计
  - `owner_stale` / `takeover` / `yield_to_peer`
- MVP 规则：
  - `owner_stale > 0` fail（默认 0 容忍）
  - `takeover > 0` fail（默认 0 容忍）
  - `yield_to_peer` 默认 warning（可配置阈值）
- 解释：MVP 阶段对“异常协商”先严控；后续再引入更细的“频率/窗口”口径。

### Gate E: multi-parent selection / cost sanity（MVP）
- 判定依据：`summary.cost`
  - `cost.requests.byStage.attention`
  - `cost.refreshPlan.skippedByFreshCache`
  - `cost.requests.byParent`
- MVP 规则：
  - `attention` 请求数超过阈值则 fail（默认很大，按环境调）
  - `skippedByFreshCache` 低于期望则 warning（用于发现 refresh gating 没起效）
- 解释：这是“成本异常”门禁的 MVP 入口；阈值与动作映射会在 P7-3 收口。

---

## 3) 结果表达（P8-2 graded）

门禁输出为结构化 JSON：
- `gateLevel=PASS|WARN|FAIL`
- `releaseDisposition=long_run_ok|observe_only|must_fix_first`
- `SAFE_FOR_LONG_RUN=yes|no`
- `pass`（boolean，兼容旧字段）
- `gateReasons[]`：每条包含 level=fail|warn|info + code + detail
- `evidencePaths[]`：可复盘的文件路径（summary/decision/act/echo）
- `keyMetrics`：用于人类快速阅读的关键统计

分级语义详见：`docs/p8-2-gate-grading.md`

---

## 4) 为什么这是 MVP gates，不是生产 SLA

- 规则刻意“先严后松”，用于把长期运行的底线从经验收敛为可执行门禁。
- 不承诺组织级 SLO；不引入告警/CI 平台。
- 后续阶段（P7-3 及以后）再把：阈值口径、窗口统计、错误分类、以及 signal→action 收成更成熟的运行机制。
