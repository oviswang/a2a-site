# P12-2 Release-ready Gate Semantics（统一放行标准，MVP）

目标：
把现有 `graded gate` + `deep policy disposition` + `required regression set` + `evidence` 收成**发布前统一放行标准**的语义输出。

约束：
- deterministic
- 不做 release platform
- 不引入 AI 判断

入口：`scripts/p7_2_gate_mvp.sh`

---

## 1) 统一输出字段（MVP）

- `releaseReady: yes|no`
- `releaseReadiness: ready|observe_only|blocked`
- `releaseBlockingReasons[]`
- `requiredRegressionsComplete: true|false`
- `evidenceSufficiency: sufficient|partial|insufficient`

> MVP 约定：
> - `requiredRegressionsComplete` 默认 false（unknown），用于强制把“未执行 checklist”与“真正 ready”区分开。
> - `evidenceSufficiency` 以 loops>=60 作为 long-window 充分性提示（sufficient），否则为 partial。

---

## 2) 统一语义定义

### ready
- 必要条件（MVP）：
  - `gateLevel != FAIL`
  - `releaseDisposition != must_fix_first`
  - `requiredRegressionsComplete == true`
  - `releaseBlockingReasons` 为空

### observe_only
- 典型：
  - gate 未 fail，但 required regressions 未确认齐全（unknown/false）
  - 或属于策略允许的观察期信号（例如 single 长窗 mostly-wait → observe_only）

### blocked
- 一票否决项（MVP）：
  - `gateLevel == FAIL` 或 `releaseDisposition == must_fix_first`
  - HUMAN_ACTION_REQUIRED / act_fail / degraded / stuck
  - deep policy long-window override 触发 `must_fix_first`

---

## 3) deep policy + required regressions + evidence 如何共同决定

- deep policy override：
  - 若 `matrixDispositionOverride` 存在且最终 `releaseDisposition==must_fix_first`，视为 `deep_policy_must_fix_first` blocking。
- required regressions：
  - 未确认齐全时不允许 ready（默认 observe_only）。
- evidence sufficiency：
  - long-window (loops>=60) 视为 sufficient；否则 partial（提示需要更强证据再收紧）。

---

## 4) 为什么这是 MVP

- 只做统一语义输出与 blocking 语义钉死；不做自动执行 checklist，也不引入 CI/CD。
- 后续阶段可把 `requiredRegressionsComplete` 从“默认 unknown”提升为“由 checklist 产物驱动”的确定值。
