# P7-1：容量与成本基线（runner MVP）

目标：
让多 parent、多 loop、同 role 多实例下的运行成本变成**可量化、可比较、可讨论**的事实面（runner 视角）。

范围：
- 只做 runner 计数与汇总（不改核心执行流程）
- 输出 deterministic、可 diff 的结构化结果

---

## 1) Cost/Capacity 口径（MVP）

### A) per-run / aggregated（累计）
写入 `*.summary.json` 的 `cost` 区块：
- `cost.loops`：累计 loop 数
- `cost.requests.total`：累计请求数（runner 视角）
- `cost.requests.byStage`：按 stage 分组的请求数
  - `token`
  - `join`
  - `attention`
  - `task_get`
  - `deliverable_get`
  - `act`
  - `echo`
- `cost.requests.byParent`：按 parentTaskId 分组的 attention fetch 计数（只在实际 willFetch 时计数）
- `cost.refreshPlan.willFetch`：refreshPlan 中 willFetch=true 的累计次数
- `cost.refreshPlan.skippedByFreshCache`：refreshPlan 中因 fresh_cache 而跳过 fetch 的累计次数

> 解释：
> - “这次 run 花了多少请求” → `cost.requests.total`
> - “哪个 stage 最贵” → `cost.requests.byStage`（最大值）
> - “哪个 parent 拉得最多” → `cost.requests.byParent`（最大值）
> - “refresh policy 是否省请求” → 对比 refresh_ms=0 vs refresh_ms>0 的：
>   - `cost.requests.byStage.attention`
>   - `cost.refreshPlan.skippedByFreshCache`

---

## 2) Trace 如何体现

- 单次 API 请求 trace：仍按既有 `*.token_check.json / *.join.json / attention.<pid>.json / *.task_get.json / *.deliverable_get*.json / *.act.json / *.echo.json` 写入。
- 汇总视图：每次写 `*.summary.json` 时，附带 `summary.cost`（累计计数）。

这样能做到：
- trace 用于定位“发生了什么”
- summary 用于比较“成本怎么样”

---

## 3) Benchmark（最小可复现）

脚本：`scripts/p7_1_benchmark_mvp.sh`

特点：
- 非压测平台；只跑少量固定组合
- 每个组合跑很少 loops（默认 3）
- 输出：
  - `artifacts/p7-1-bench/<ts>/index.txt`（组合名 → traceDir）
  - 每个 traceDir 下的 `latest.summary.json`（便于 diff）

建议对比组合：
- parents=small/medium/large
- refresh_ms=0 vs refresh_ms>0
- same-role off vs on（只选一个代表 size）

---

## 4) 当前“轻量容量边界”表述（MVP）

本阶段仅给 runner 视角的“趋势与触发条件”，不承诺绝对 QPS：
- parent 数上升时，主要成本增量来自 `attention` stage（按 parent fetch 计数线性增长）。
- 启用 refresh gating（refresh_ms>0）后：
  - `cost.refreshPlan.skippedByFreshCache` 应上升
  - `cost.requests.byStage.attention` 应下降或增长变缓
- 最容易把成本拉高的配置：
  - `A2A_PARENT_REFRESH_MS=0`（强制全量刷新）
  - parent 数大 + `A2A_PARENT_SMALL_ALL` 过大（导致长期全量刷新）
  - `A2A_PARENT_RR_K` 过大（每 loop 额外补刷过多 parent）
  - 过多同 role 多实例（导致 `task_get/deliverable_get` 的重复读取上升）

---

## 5) 如何读结果（最短路径）

1) 跑 benchmark：得到每个组合的 `latest.summary.json`
2) 对比两个 summary：
- refresh_ms=0 vs refresh_ms>0：看 `attention` 与 `skippedByFreshCache`
- parent 数 small→large：看 `attention` 与 `byParent` 的分布
3) 若成本异常：再打开对应 traceDir 的 attention.* / act / echo 进行定位
