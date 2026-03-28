# P10-2 Deep Gate Matrix（MVP）

目标：
把 gate matrix 从“mode + signalClass + severity 的语义上下文”，推进到具备 **window / ratio** 的深矩阵策略：
- 区分偶发 vs 持续
- 区分比例过高
- 让输出可引用明确 rule id

约束：
- deterministic
- 不做复杂策略引擎
- 只在现有 gate 输出上增加更细语义上下文

---

## 1) 新增 window / ratio 语义（gate 输出字段）

在 `scripts/p7_2_gate_mvp.sh` 中新增：
- `windowedMetrics`（best-effort）
  - `loops`
  - `handoff_ratio = counts.handoff / loops`
  - `wait_ratio = counts.wait / loops`
  - `act_fail_ratio = counts.act_fail / loops`
  - `human_required_ratio = counts.HUMAN_ACTION_REQUIRED / loops`
  - `attention_req`
  - `parent_count`
  - `attention_req_per_parent = attention_req / parent_count`
  - `yield_rate = yield_to_peer / loops`
  - `owner_stale_rate = owner_stale / loops`
  - `takeover_rate = takeover / loops`

---

## 2) mode-specific 深矩阵规则（MVP）

规则以 `matrixRuleId` 标识，并用 `matrixDecisionBasis[]` 记录触发依据（字段 + 阈值）。

### same_role
- `Rsr1:same_role:yield_rate_high`
  - 触发：`yield_rate > 0.5`
  - 语义：coordination 噪声高，倾向 WARN/observe_only
- `Rsr2:same_role:owner_stale_seen`
  - 触发：`owner_stale_rate > 0`
  - 语义：同 role 协商不稳（若频繁可升级）
- `Rsr3:same_role:takeover_seen`
  - 触发：`takeover_rate > 0`
  - 语义：接管发生（若非真实 stale owner，倾向 FAIL）

### multi_parent
- `Rmp1:multi_parent:attention_per_parent_high`
  - 触发：`attention_req_per_parent > 5`
  - 语义：attention 成本随 parent 过高，倾向 WARN/FAIL（结合 gate thresholds）

### single
- `Rs1:single:mostly_wait`
  - 触发：`wait_ratio > 0.8`
- `Rs2:single:mostly_handoff`
  - 触发：`handoff_ratio > 0.8`

### cross-cutting
- `Raf1:<mode>:act_fail_seen`
  - 触发：`act_fail_ratio > 0`
- `Rhr1:<mode>:human_required_seen`
  - 触发：`human_required_ratio > 0`

---

## 3) 与 graded gate 的关系

- deep matrix 先提供“更细语义上下文”（metrics + rule id），不推翻现有 PASS/WARN/FAIL 规则。
- 后续可在保持 deterministic 的前提下，将 rule id 逐步纳入分级/处置策略（P10-2 之后的深化）。

---

## 4) 为什么这是 deep matrix MVP

- 先落地可解释的 window/ratio 字段与 rule id。
- 不引入策略引擎；不做全覆盖；先让证据与规则可引用、可复查。
