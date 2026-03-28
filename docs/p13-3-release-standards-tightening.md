# P13-3 Release Standards Tightening（MVP）

目标：
把发布放行标准从“统一语义 + checklist”进一步收紧为更硬约束：
- regressions 缺项可证明、可阻断
- 证据不足可阻断
- deep policy must_fix_first 作为高优先级阻断

不做：平台 / CI / 自动修复。

---

## 1) 收紧点（MVP）

### A) 绝对阻断（blocking reasons 一票否决）
- `human_action_required`
- `act_fail`
- `degraded`
- `stuck`
- `deep_policy_must_fix_first`
- `gate_failed_or_must_fix_first`
- `required_regressions_incomplete`
- `evidence_insufficient`

### B) observe_only 的边界（MVP）
- P13-3 版本下：
  - release 语义默认更硬：缺 regressions 或证据不足直接 blocked。
  - observe_only 主要用于非 release（运行观察），不再作为发布放行态。

### C) regressions / evidence / deep policy 如何共同影响
- regressions：completion.json 驱动 `requiredRegressionsComplete`，缺项直接 blocked。
- evidence：MVP 以 long-window(loops>=60) 视为 sufficient，否则 blocked。
- deep policy：存在 override 且最终 must_fix_first → 直接 blocked。

---

## 2) 为什么是 MVP

- 先把“必须挡”的语义钉死，确保 release-ready 真正可守门。
- 后续阶段再细化：不同 changeType 的证据门槛（并非都要求 long-window）、以及哪些场景允许 observe_only 放行。
