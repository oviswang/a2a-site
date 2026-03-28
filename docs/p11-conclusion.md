# P11 阶段定稿（最终版）

> 基线：仅基于 `a2a-site` 当前真实产物（P11-1 long-window evidence、P11-2 deep policy disposition、P11-3 required regression set）。

## p11 conclusion
- P11 现在完成了什么
  - 把系统从“短窗证据 + 解释型 deep matrix + 模板型回归”推进为：**long-window 证据基线**、**可执行默认处置（deep policy disposition）**、以及 **按变更类型的必跑回归清单（required regression set）**。
- 已经具备了什么（长窗证据 / 深策略落地 / 变更守门工程化）
  - **长窗证据**：新增 long window evidence set（60 loops），覆盖 single/multi_parent/same_role + 轻量组合，三件套（summary/gate/signal_to_action）+ 索引（matrix.json/index.tsv）可复跑/可 diff。
  - **深策略落地**：gate 具备 `dispositionPolicyVersion` + `matrixDispositionOverride` + `dispositionReason`，且 long-window 下 mode-specific 处置能 deterministic 生效（MVP）。
  - **变更守门**：回归从模板升级为“变更类型→必跑/可选/通过条件”的 checklist，并把 deep policy 漂移检查纳入必跑项。
- 还不具备什么
  - **更真实的长跑密度**：long-window 仍是轻量样本集，尚未扩到更多点位/更长周期/更多真实轨迹。
  - **更广的深策略覆盖**：目前只落地少量高频 rule 的处置覆盖，尚未形成更完整的 mode-specific 默认处置全集。
  - **更全的必跑集合**：required regressions 已成形但仍是 MVP 覆盖，尚未扩成更接近“发布级必跑清单”的全量。

## completed delivery in p11
- P11-1 完成了什么
  - `docs/p11-1-evidence-expansion.md` + `artifacts/evidence/p11-1/20260328T070328Z/` long-window evidence set。
- P11-2 完成了什么
  - `scripts/p7_2_gate_mvp.sh` 落地 deep policy disposition 输出与 overrides；`docs/p11-2-deep-policy-disposition.md`。
- P11-3 完成了什么
  - `docs/p11-3-required-regressions.md`（按变更类型必跑清单）+ runbook 入口更新 + 样例 outputs。

## what is now formally delivered
- long-window evidence（MVP）
  - `artifacts/evidence/p11-1/20260328T070328Z/`（matrix.json/index.tsv + cases 三件套）。
- deep policy disposition（MVP）
  - gate 输出字段与 deterministic 覆盖：`dispositionPolicyVersion`/`matrixDispositionOverride`/`dispositionReason`。
- required regression set（MVP）
  - `docs/p11-3-required-regressions.md`（change type checklist）+ `docs/ops-runbook.md` 入口。

## remaining gap
- 如果要继续走下一阶段，还差什么
  - **证据扩展**：更多点位（推荐区间内/边界外更多档）、更长窗口/更真实长跑轨迹。
  - **处置策略扩面**：把更多 rule（owner_stale/takeover/act_fail/HUMAN 等）系统纳入 mode-specific disposition。
  - **发布级回归集合**：把更多变更类型与验证组合纳入必跑清单，并形成更接近“最小发布门禁”的集合。
- 为什么属于下一阶段
  - P11 已完成“long-window 基线 + 可执行处置 MVP + checklist MVP”的阶段目标；剩余差距主要是**覆盖面与强度提升**，属于规模化扩展而非本阶段未闭环。

## final verdict
- P11 是否可以正式收口
  - **可以**（三条主线均已形成可引用、可执行、可守门的 MVP 基线）。
- 当前成熟度阶段
  - **具备 long-window 基线 + 可执行默认处置 + 变更守门 checklist 的工程化 MVP 阶段**；可用于约束高风险改动，但仍需扩大证据/规则/回归覆盖面以达到发布级成熟度。
- 下一步是否建议进入新阶段
  - **建议进入**：下一阶段聚焦“覆盖面扩展与发布级门禁收敛”。
