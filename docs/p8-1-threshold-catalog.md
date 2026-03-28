# P8-1 Threshold Catalog（阈值口径基线，MVP）

目标：
把当前 `a2a-site` 里**真实生效**的阈值入口（runner / gates / coordination / cost-refresh）盘点出来，并为每个阈值形成可引用、可对齐、可复查的最小口径卡片。

约束：
- 只基于当前 repo 现状（不引入新配置系统）
- 文档口径 = 脚本默认值 = runbook/observability 表述

---

## A) Runner: summary.health 判定阈值（scripts/a2a_runner_mvp.mjs）

### CARD: HEALTH_SPINNING_RATIO
- 阈值名：HEALTH_SPINNING_RATIO
- 默认值：`max(3, floor(windowLoops * 0.6))`
- 语义：**hard**（触发 `health=stuck`）
- 适用模式：single / multi-parent / same-role（都适用；基于 window counts）
- 证据字段：`summary.counts.{noop,precondition_failed,stale_skip,dedupe_skip}`, `summary.windowLoops`, `summary.health`
- 可调范围：当前**不可配置**（代码内固定）
- 使用位置：runner `healthOfCounts()`

### CARD: HEALTH_STUCK_NO_PROGRESS
- 阈值名：HEALTH_STUCK_NO_PROGRESS
- 默认值：`act_ok==0 && wait==0`（联合条件）
- 语义：**hard**（参与 `health=stuck` 判定）
- 适用模式：all
- 证据字段：`summary.counts.act_ok`, `summary.counts.wait`, `summary.health`
- 可调范围：不可配置
- 使用位置：runner `healthOfCounts()`

### CARD: HEALTH_DEGRADED_ANY_ACT_FAIL
- 阈值名：HEALTH_DEGRADED_ANY_ACT_FAIL
- 默认值：`act_fail>0` → `health=degraded`
- 语义：**info→warn**（runner 标记 degraded；是否 fail 由 gate 决定）
- 适用模式：all
- 证据字段：`summary.counts.act_fail`, `summary.health`
- 可调范围：不可配置
- 使用位置：runner `healthOfCounts()`

### CARD: HEALTH_DEGRADED_ANY_HUMAN_REQUIRED
- 阈值名：HEALTH_DEGRADED_ANY_HUMAN_REQUIRED
- 默认值：`HUMAN_ACTION_REQUIRED>0` → `health=degraded`
- 语义：**info→warn**（runner 标记 degraded；是否 fail 由 gate 决定）
- 适用模式：all
- 证据字段：`summary.counts.HUMAN_ACTION_REQUIRED`, `summary.health`
- 可调范围：不可配置
- 使用位置：runner `healthOfCounts()`

---

## B) Runner: policy freshness / coordination / refresh 的阈值（scripts/a2a_runner_mvp.mjs）

### CARD: A2A_SUMMARY_EVERY
- 阈值名：A2A_SUMMARY_EVERY
- 默认值：`20`（loops）
- 语义：info（决定 summary 输出频率，影响 gate 可用事实面覆盖率）
- 适用模式：all
- 证据字段：`*.summary.json` 是否产出、以及 `summary.cost` 是否可用
- 可调范围：`>=1`（建议）；`0` 视为关闭
- 使用位置：runner main loop

### CARD: A2A_BLOCKED_MAX_AGE_MS
- 阈值名：A2A_BLOCKED_MAX_AGE_MS
- 默认值：`10 * 60 * 1000`（10 min）
- 语义：hard（blocked stale → `HUMAN_ACTION_REQUIRED`）
- 适用模式：all（blocked 类型）
- 证据字段：`decision.precondition.kind=blocked_freshness`, `decision.policyDecision=HUMAN_ACTION_REQUIRED`
- 可调范围：`>=0` ms
- 使用位置：blocked action precondition

### CARD: A2A_YIELD_WINDOW_MS
- 阈值名：A2A_YIELD_WINDOW_MS
- 默认值：`60000`（60s）
- 语义：warn/info（同 role 非 owner 让出窗口，降低争抢噪声）
- 适用模式：same-role coordination
- 证据字段：`decision.policyDecision=handoff`, `decision.reasonCode=yield_to_peer`, `decision.yieldUntil`
- 可调范围：`>=0` ms
- 使用位置：same-role yield window

### CARD: A2A_OWNER_STALE_MS
- 阈值名：A2A_OWNER_STALE_MS
- 默认值：`120000`（120s）
- 语义：warn→hard（触发 owner_stale / takeover 或 handoff）
- 适用模式：same-role coordination
- 证据字段：`decision.reasonCode in {owner_stale,takeover}`, `decision.reasonDetail.ownerStaleMs`
- 可调范围：`>=0` ms
- 使用位置：P6-2 stale owner rule

### CARD: A2A_PARENT_REFRESH_MS
- 阈值名：A2A_PARENT_REFRESH_MS
- 默认值：`0`（disabled；全量 refresh）
- 语义：info（成本控制开关：0=不省请求）
- 适用模式：multi-parent
- 证据字段：`decision.refreshPlan[*].willFetch/fetchReason`, `summary.cost.refreshPlan.*`
- 可调范围：`0..` ms
- 使用位置：P6-1 refresh gating

### CARD: A2A_PARENT_SMALL_ALL
- 阈值名：A2A_PARENT_SMALL_ALL
- 默认值：`5`
- 语义：info（parents<=阈值时全量 refresh）
- 适用模式：multi-parent
- 证据字段：`decision.refreshPlan[*].tierReasons includes small_all`
- 可调范围：`>=0`
- 使用位置：P6-1 small parent behavior

### CARD: A2A_PARENT_RR_K
- 阈值名：A2A_PARENT_RR_K
- 默认值：`1`
- 语义：info（每 loop RR 补刷 parent 数）
- 适用模式：multi-parent
- 证据字段：`decision.refreshPlan[*].tierReasons includes round_robin`
- 可调范围：`>=0`
- 使用位置：P6-1 RR supplement

---

## C) Gates: 稳态门禁阈值（scripts/p7_2_gate_mvp.sh）

> 说明：gates 的默认值当前是 MVP（先严后松前的“严”），P8-2 会引入 PASS/WARN/FAIL 分级。

### CARD: GATE_MAX_STUCK_WINDOWS
- 默认值：`0`
- 语义：hard fail
- 证据字段：`summary.health=stuck` → `gateReasons.code=stuck`
- 适用模式：all

### CARD: GATE_MAX_DEGRADED_WINDOWS
- 默认值：`0`
- 语义：hard fail（strict MVP）
- 证据字段：`summary.health=degraded` → `gateReasons.code=degraded`
- 适用模式：all

### CARD: GATE_MAX_ACT_FAIL
- 默认值：`0`
- 语义：hard fail
- 证据字段：`summary.counts.act_fail` → `gateReasons.code=act_fail`
- 适用模式：all

### CARD: GATE_MAX_HUMAN_REQUIRED
- 默认值：`0`
- 语义：hard fail
- 证据字段：`summary.counts.HUMAN_ACTION_REQUIRED` → `gateReasons.code=human_action_required`
- 适用模式：all

### CARD: GATE_MAX_OWNER_STALE
- 默认值：`0`
- 语义：hard fail（same-role 不稳）
- 证据字段：decision reasonCode 统计 `owner_stale` → `gateReasons.code=same_role_owner_stale`
- 适用模式：same-role coordination

### CARD: GATE_MAX_TAKEOVER
- 默认值：`0`
- 语义：hard fail（same-role 不稳）
- 证据字段：decision reasonCode 统计 `takeover` → `gateReasons.code=same_role_takeover`
- 适用模式：same-role coordination

### CARD: GATE_MAX_YIELD_TO_PEER
- 默认值：`999999`
- 语义：warn（默认基本不限制）
- 证据字段：decision reasonCode 统计 `yield_to_peer` → `gateReasons.code=same_role_yield_to_peer`
- 适用模式：same-role coordination

### CARD: GATE_MAX_ATTENTION_REQ
- 默认值：`999999`
- 语义：hard fail（cost sanity；默认极宽）
- 证据字段：`summary.cost.requests.byStage.attention` → `gateReasons.code=attention_cost_high`
- 适用模式：multi-parent

### CARD: GATE_MIN_FRESH_CACHE_SKIP
- 默认值：`0`
- 语义：warn（refresh gating 没起效的提示）
- 证据字段：`summary.cost.refreshPlan.skippedByFreshCache` → `gateReasons.code=refresh_skip_low`
- 适用模式：multi-parent（refresh_ms>0 时有意义）

---

## D) Action loop: recommendedActions 的阈值入口（scripts/p7_3_signal_to_action.mjs / docs/ops-runbook.md）

- 当前 action loop 的判定主要依赖：
  - gateReasons（fail/warn code）
  - summary.counts 比例（handoff/wait 等）
  - summary.cost（attention stage dominance）

> 这些阈值口径在 P8-3 会进一步补“做完后怎么验证”。

---

## 对齐状态（P8-1 最小对齐）

- runner health 口径：以 `healthOfCounts()` 为准（本页已归档）
- gates 默认值：以 `scripts/p7_2_gate_mvp.sh` env 默认值为准（本页已归档）
- runbook/observability：引用 gates 与 health 的同一术语（stuck/degraded/act_fail/HUMAN_ACTION_REQUIRED 等）

