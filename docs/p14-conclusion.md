# P14 阶段定稿（最终版）

> 基线：仅基于 `a2a-site` 当前真实产物（graded thresholds 接入、selection 门禁工程化、completion required runs 扩面）。

## p14 conclusion
- P14 现在完成了什么
  - 把发布治理从“硬阻断基线”推进为更可持续的工程化治理：**按 changeType 的分级门槛（partial evidence 不再一刀切）**、**selection 成为正式 gate 对象（有 reason/rule/处置/回归）**、以及 **required runs 映射扩面（更难漏）**。
- 已经具备了什么（门槛分级 / selection 门禁 / regressions 完整性）
  - **门槛分级**：gate 支持 `--change-type`，并对 partial evidence 做 changeType-aware 处置（runner_behavior_change 可 observe_only，其它高风险仍 blocked）。
  - **selection 门禁**：selection 有最小信号（churn rate / parent switches）+ gateReason（selection_churn_*）+ matrixRuleId（Rsel*）+ disposition（must_fix_first/observe_only），并进入 required regressions 与 checklist。
  - **完整性**：completion REQUIRED_RUNS 扩到 same_role/runner/selection，missingRequired 携带 mode/window/whyBlocking，漏跑更可核对。
- 还不具备什么
  - **更细的分级矩阵**：当前分级主要按 changeType（MVP），尚未系统引入 mode×window×evidence type 的更细门槛。
  - **selection 覆盖扩面**：仅落地 churn/空转一条主信号，仍需更多 selection 问题类型与对照样例密度。

## completed delivery in p14
- P14-1 完成了什么
  - `docs/p14-1-graded-thresholds.md` + `artifacts/examples/p14-1-graded-thresholds.json` + gate `--change-type` 接入与真实样例。
- P14-2 完成了什么
  - `scripts/p7_2_gate_mvp.sh` 增加 selection 信号/理由/规则；`docs/p14-2-selection-gating.md`；更新 required regressions 与 release checklist 的 selection_logic_change 必跑项；样例输出。
- P14-3 完成了什么
  - `scripts/p13_1_regression_completion.mjs` REQUIRED_RUNS 扩面（same_role/runner/selection）+ missingRequired 更可解释；`docs/p14-3-required-regression-expansion.md`；completion 样例。

## what is now formally delivered
- graded thresholds（MVP）
  - changeType-aware evidence 门槛（partial→blocked/observe_only 分级）。
- selection gating（MVP）
  - selection 作为正式门禁对象（信号+reason+rule+处置+必跑项）。
- expanded required regressions（MVP）
  - completion 映射扩面与缺项解释增强（mode/window/whyBlocking）。

## remaining gap
- 如果要继续走下一阶段，还差什么
  - **分级门槛深化**：从 changeType 分级推进到 mode/window/evidence 类型的更完整矩阵（避免误伤与漏放）。
  - **selection 工程化扩面**：更多 selection rule/reason 与回归必跑集合（并与 completion/门禁标准同步）。
  - **发布级默认必跑集合收敛**：把更多 changeType 的必跑集合纳入 completion 映射，减少“人工挑选”。
- 为什么属于下一阶段
  - P14 已完成“可运行的分级/selection/扩面”MVP 基线；剩余主要是覆盖与矩阵化深化，属于发布治理的进一步收敛。

## final verdict
- P14 是否可以正式收口
  - **可以**（三条主线均形成可执行、可核对的 MVP 产物）。
- 当前成熟度阶段
  - **发布治理工程化 MVP+**：具备分级门槛与 selection 正式门禁对象，并提升必跑集合的可核对性，但仍需更完整的矩阵化与覆盖扩面。
- 下一步是否建议进入新阶段
  - **建议进入**：下一阶段聚焦分级矩阵深化 + selection 覆盖扩面 + 发布级默认必跑集合进一步收敛。
