# P19-1 Matrix primary surface（MVP）

目标：
把 gate 从“matrix 参与判定”推进到“matrix 成为更明确主判定层”。

---

## 1) 本轮扩大 table-driven 覆盖

在 P18-1 allowlist 基础上新增：
- `gate_rule_change`

---

## 2) 执行顺序（MVP）

1) **硬阻断优先**（不被 matrix 覆盖）：
   - HUMAN / act_fail / degraded / stuck
   - deep_policy_must_fix_first
   - gate_failed_or_must_fix_first
   - required_regressions_incomplete

2) **无硬阻断时：matrix-first**
   - 先执行 matrix lookup → 得到门槛（requiresLongWindow / requiresBoundaryEvidence / allowObserveOnly）
   - 再决定 readiness

3) **旧分支兜底**
   - 仅允许更严格，不得放松 matrix 结论

---

## 3) tableDriven 审计输出增强

release 输出的 `tableDriven` 增加：
- `derivedInputs`（changeType/mode/window/desiredEvidenceTypes）
- `matchedCell`
- `finalAppliedDecision`
- `why`

---

## 4) 为什么是 MVP

- 仅对 allowlist changeType 启用 table-driven。
- 不做策略引擎，不删除旧逻辑。
- 先让 matrix 成为主判定层的“第一优先决策”，并可审计。
