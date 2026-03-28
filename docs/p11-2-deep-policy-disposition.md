# P11-2 Deep Policy Disposition（MVP）

目标：
把 deep gate matrix 从“解释上下文”推进到更接近真实长期运行处置的**默认落地规则**：
- mode-specific
- long-window sensitive
- deterministic

入口：`scripts/p7_2_gate_mvp.sh`

---

## 1) 新增输出字段（处置落地）

- `dispositionPolicyVersion`
- `matrixDispositionOverride`（当 deep policy 覆盖 base graded gate）
- `dispositionReason[]`（deterministic 说明）

---

## 2) MVP 默认处置规则（按 mode + long window）

> long window 判定：`windowedMetrics.loops >= 60`

### same_role
- 规则：long window 且 `yield_rate > 0.5` → `FAIL / must_fix_first`
  - 理由：长期持续性让出意味着协商层不稳，应先修（减少实例/调 yield/handles）。
- 规则：`yield_rate > 0.2` 且 base=PASS → `WARN / observe_only`

### multi_parent
- 规则：long window 且 `attention_req_per_parent > 5` → `FAIL / must_fix_first`
  - 理由：单位 parent 注意力成本在长窗稳定过高，属于成本回归，应先修（refresh gating 调参）。

### single
- 规则：long window 且 `wait_ratio > 0.8` 且 base=PASS → `WARN / observe_only`
  - 理由：长期 mostly-wait 可能是“健康空闲”或 access/selection 配置问题，默认不直接 fail，但不视为长期稳定。

---

## 3) 与 evidence（P11-1）的关系

这些处置规则以 long-window evidence set 为基线（`artifacts/evidence/p11-1/...`），用于把 ratio/window 语义从“解释”推进到“默认处置”。

---

## 4) 为什么这是 MVP

- 只落地少量高频 rule（yield_rate / attention_per_parent / wait_ratio）。
- 不引入策略引擎；不做全覆盖。
- 先保证 deterministic、可解释、可复查，再扩展更多规则与阈值。
