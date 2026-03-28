# P7：容量 / 成本 / 稳态门禁 — Execution Plan（定稿）

目标（P7 只做一件事）：
把 A2A 从“可治理、可协商、可多 parent 运行的 MVP+”，推进到“容量边界更清楚、运行成本更可控、稳态门禁更明确”。

约束：
- 不回头补 P0–P6 零碎尾巴
- 不做大平台重构、不做复杂基础设施
- 先计划，后最小交付

---

## execution plan

### P7-1：容量与成本基线（先做）
**怎么做**
- 定义最小口径（runner 视角、可复现）
  - per-loop：request 数（按 stage）、耗时（按 stage）、act/noop/handoff/HUMAN_ACTION_REQUIRED 比例
  - per-parent：refresh 计划命中（willFetch / skippedByFreshCache / selectedByTier）、实际 fetch 次数
  - cache/refresh：refreshPlan 命中率、cache fresh skip 命中率、RR 防饥饿命中率（只做计数与占比）
- 在 runner 现有 trace/summary 基础上增补 cost 视图（不改变核心决策）
  - 最小实现：在 `*.summary.json` 增加 `cost` 区块（以及可选 `perParent` cost rollup）
  - 记录必须 deterministic：只写计数、占比、耗时，不引入随机采样
- 提供最小 benchmark（非压测平台）
  - 固定 env 组合：parents=小/中/大，refresh_ms=0/典型值，same-role on/off，max_loops=K
  - 输出：一组可对比的 summary + traceDir 索引（作为“样本事实面”）

**最小交付物**
- `docs/p7-1-capacity-cost-baseline.md`
- 可复现样本 artifacts（summary/trace 索引）
- 1 个 deterministic benchmark/profile 脚本（可重复跑、输出稳定）

---

### P7-2：稳态门禁
**怎么做**
- 定义最小门禁标准（先文档化、再脚本化）
  - stuck/degraded：连续 N loops 处于 stuck/degraded 的上限
  - action 质量：act_fail 比例上限、echo_fail 比例上限
  - 人类介入：HUMAN_ACTION_REQUIRED 是否允许出现、允许出现的次数/窗口
  - same-role：takeover 是否异常频繁（作为不稳定信号）
  - multi-parent：选择抖动是否超阈值（以 summary/decision 计数为准）
- 做轻量 gate script（不做 CI 平台）
  - 输入：traceDir 或 artifacts 根目录
  - 输出：结构化 gate 结论（pass/fail + reasonCodes + evidence paths + 建议下一步看哪个文件）

**最小交付物**
- `docs/p7-stability-gates.md`
- `scripts/a2a_gate_mvp.mjs`（或同等级轻量脚本）
- gate 输出样例（固定一组 artifacts 作为示例）

---

### P7-3：成本与稳态的 runbook 闭环
**怎么做**
- 将 P7-1/P7-2 的信号映射为 deterministic 的操作动作
  - cost：refresh 成本高 → 调 `A2A_PARENT_REFRESH_MS/SMALL_ALL/RR_K` 的优先序与风险提示
  - handoff：handoff 过高 → 检查 role/owner ring/parent selection 的固定路径
  - stuck/degraded：先看 summary 的 stage→再看对应 trace→按 runbook 动作恢复
- 把“signal → action”串进现有 ops 文档与 inspect
  - runbook 增补章节：常见症状 → 证据路径 → 动作
  - inspect 增强：展示 cost/stability 关键字段并打印固定建议（非 AI 自由诊断）

**最小交付物**
- `docs/ops-runbook.md` 增补（P7 信号→动作）
- `docs/ops-observability.md` 增补（如何读 cost/gate 输出）
- inspect/summary 的建议动作增强（脚本输出层面）

---

## current priority
- 最先动：**P7-1 容量与成本基线**
- 原因：
  - P7-2 门禁阈值与 P7-3 闭环动作必须建立在可量化事实面上；否则门禁/动作只能凭感觉。
  - P7-1 可用最小侵入方式落地（计数 + 汇总 + 样本），不引入平台工程。

---

## expected outcome
- 完成 P7-1：成本与容量边界“可量化/可比较/可讨论”，形成调参讨论的共同事实面。
- 完成 P7-2：把“能否长期跑”收敛为可执行门禁结论，可用于改动前后对比。
- 完成 P7-3：形成可复用的“信号→动作”闭环，降低恢复时间与误操作率。

---

## stage direction
- 现在进入 P7 的理由：P6 已交付可运行的治理闭环（策略+稳态机制+可观测+runbook+检查节奏），下一步瓶颈变成容量/成本与“长期跑的明确门禁”。
- 离“更成熟、可放心长期跑”的核心差距：
  - 容量边界未量化（缺基线/趋势/触发条件）
  - 成本未可控到可承诺（缺 per-loop/per-parent cost 视图）
  - 稳态门禁未明确可执行（缺 gate 脚本与固定判定口径）
