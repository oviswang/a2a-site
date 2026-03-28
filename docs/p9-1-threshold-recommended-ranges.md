# P9-1 Threshold Recommended Ranges（最小证据版）

目标：
把一批关键阈值从“默认值”推进到“**有最小证据支持的推荐区间**”，并明确适用模式与证据来源。

范围（本轮优先阈值子集）：
- refresh / cost：`A2A_PARENT_REFRESH_MS`, `A2A_PARENT_SMALL_ALL`, `A2A_PARENT_RR_K`
- same-role coordination：`A2A_OWNER_STALE_MS`, `A2A_YIELD_WINDOW_MS`
- gate tolerance：`GATE_MAX_ATTENTION_REQ`, `GATE_MIN_FRESH_CACHE_SKIP`

证据约束：
- 不追求统计学完美；只要求可复跑、可解释、可引用
- 证据来源：现有 docs（口径）+ 现有 samples（summary/gate/action-validation 输出）

---

## 1) 推荐区间总览（MVP）

### A2A_PARENT_REFRESH_MS
- 默认值：0（disabled，全量刷新）
- 推荐区间：**30s–5m**（启用 gating；按 parent 数与 freshness 需求调）
- 适用模式：multi-parent
- 证据字段：`summary.cost.requests.byStage.attention`, `summary.cost.refreshPlan.skippedByFreshCache`, `decision.refreshPlan[*]`
- 偏紧/偏松：
  - 偏紧：0ms（在中/大 parent 下成本线性上升且无 skip）
  - 偏松：>10m（可能牺牲 attention freshness；视工作负载）

### A2A_PARENT_SMALL_ALL
- 默认值：5
- 推荐区间：**3–8**（保持小，避免中等 parent 数进入长期全量刷新）
- 适用模式：multi-parent
- 证据字段：`decision.refreshPlan[*].tierReasons`（small_all）, `summary.cost.requests.byStage.attention`
- 偏紧/偏松：
  - 偏紧：0–1（小 parent 场景可能 under-fetch）
  - 偏松：>10（更容易长时间全量刷新，成本上升）

### A2A_PARENT_RR_K
- 默认值：1
- 推荐区间：**1–2**（避免补刷过多导致 attention 成本膨胀）
- 适用模式：multi-parent
- 证据字段：`decision.refreshPlan[*].tierReasons`（round_robin）, `summary.cost.requests.byStage.attention`
- 偏紧/偏松：
  - 偏紧：0（可能饥饿，取决于其它 tiers）
  - 偏松：>3（每 loop 基线成本明显上升）

### A2A_OWNER_STALE_MS
- 默认值：120000（120s）
- 推荐区间：**2–10m**（避免过早 takeover；视 progress surface cadence）
- 适用模式：same-role coordination
- 证据字段：`decision.reasonCode in {owner_stale,takeover}`, `gateReasons same_role_*`
- 偏紧/偏松：
  - 偏紧：<60s（慢进展工作流易误判 stale）
  - 偏松：>15m（真实 stale owner 的恢复延迟变大）

### A2A_YIELD_WINDOW_MS
- 默认值：60000（60s）
- 推荐区间：**30–120s**（降噪与不阻塞之间的折中）
- 适用模式：same-role coordination
- 证据字段：`decision.reasonCode=yield_to_peer` 频率
- 偏紧/偏松：
  - 偏紧：<10s（争抢噪声上升）
  - 偏松：>5m（某些场景下让出过久）

### GATE_MAX_ATTENTION_REQ
- 默认值：999999（默认极宽）
- 推荐区间：**先设 observe-only 的 sanity 阈值，再逐步收紧**（与 parent 数/refresh 策略相关）
- 适用模式：multi-parent
- 证据字段：`summary.cost.requests.byStage.attention` → `attention_cost_high`
- 偏紧/偏松：
  - 偏紧：<parent 数量级（会普遍 FAIL）
  - 偏松：默认值可能掩盖成本回归

### GATE_MIN_FRESH_CACHE_SKIP
- 默认值：0
- 推荐区间：**1–N（仅在 refresh_ms>0 且 cache warm 时有意义）**
- 适用模式：multi-parent
- 证据字段：`summary.cost.refreshPlan.skippedByFreshCache` → `refresh_skip_low`
- 偏紧/偏松：
  - 偏紧：在 cold cache/短跑时要求 skip（会误 WARN）
  - 偏松：0 无法提示 gating 没起效

---

## 2) 证据来源（最小对照）

- 阈值口径基线：`docs/p8-1-threshold-catalog.md`
- refresh 策略与字段：`docs/p6-1-refresh-policy.md`, `docs/p7-1-capacity-cost-baseline.md`
- stale/takeover 机制：`docs/p6-2-cross-env-stability.md`, `docs/p5-1-same-role-coordination.md`
- graded gate 语义：`docs/p8-2-gate-grading.md`
- action→validation 字段：`docs/p8-3-action-validation.md`

最小样本对照（落盘）：
- `artifacts/examples/p9-1-threshold-range-evidence.json`

---

## 3) 为什么这算“推荐区间”而不是临时默认值

- 每个区间都绑定了可复查的证据字段（summary.cost / decision reasonCode / gateReasons），并指明适用模式。
- 不承诺统计学显著性，但能支撑 P9-2 矩阵化与 P9-3 标准回路里“阈值为何这样设”的解释链。
