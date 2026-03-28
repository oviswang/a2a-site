# P9-2 Gate Matrix（MVP）

目标：
把 `graded gate` 从“零散规则”推进到更可解释、可复用的 **矩阵化语义**。

约束：
- deterministic
- 不做策略引擎
- 仅为现有 gate 输出补“矩阵语义上下文”

---

## 1) 矩阵维度（MVP）

### Mode（模式）
- `single`
- `multi_parent`
- `same_role`

> gate 输出提供：`scenarioMode`（MVP 推断）与 `matrixKey`。

### Signal class（信号类）
- `health`：stuck/degraded/act_fail
- `cost`：attention_cost_high/refresh_skip_low/no_summary_cost
- `coordination`：same_role_*（owner_stale/takeover/yield_to_peer）
- `human_boundary`：human_action_required

> gateReason 现在会附：`signalClass`。

### Severity（严重度）
- `fail`
- `warn`
- `info`

> gateReason 现在会附：`level`（fail|warn|info）。

---

## 2) MVP matrix 语义（如何落到 disposition）

本阶段不做复杂按-mode分支的策略引擎；先定义最小可解释语义：

- 任意 `fail`（任意 signalClass / 任意 mode） → `gateLevel=FAIL` → `releaseDisposition=must_fix_first`
- 无 fail 且存在 `warn` 或 `info` → `gateLevel=WARN` → `releaseDisposition=observe_only`
- 无 fail/warn/info → `gateLevel=PASS` → `releaseDisposition=long_run_ok`

并在每条 reason 上标注：
- `matrixDisposition`（must_fix_first / observe_only / long_run_ok）

---

## 3) 为什么这叫 MVP matrix

- 现在的价值是：让输出明确说明“**哪种模式**下的**哪类信号**，以什么严重度触发了什么放行语义”。
- 下一阶段再扩展：
  - mode-specific 的分级差异（例如 multi_parent 下某些 cost WARN 的阈值更严格）
  - 连续窗口/比例矩阵（而不是单次出现）

---

## 4) 输出字段（门禁输出中的矩阵上下文）

顶层：
- `scenarioModes[]`
- `matrixKey`

每个 result：
- `scenarioMode`
- `matrixKey`

每条 gateReason：
- `level` + `code`
- `signalClass`
- `matrixDisposition`

