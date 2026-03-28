# P13 阶段定稿（最终版）

> 基线：仅基于 `a2a-site` 当前真实产物（completion schema+generator+gate 接入、更新 coverage map 与新增 evidence、以及收紧后的 release standards）。

## p13 conclusion
- P13 现在完成了什么
  - 把发布前放行从“语义+checklist”推进到**可证明的硬门禁**：回归必跑项有结构化 completion 闭环、覆盖补上 selection/短长对照补点、并把 regressions/evidence 变成 release 的硬阻断标准。
- 已经具备了什么（regressions 完整性 / 覆盖厚度 / 标准硬度）
  - **完整性**：`completion.json` 能明确“跑了什么/缺什么/是否齐全”，gate 可读取并驱动 `requiredRegressionsComplete`。
  - **覆盖厚度**：更新版 coverage map + 新增 selection(long) 与 combo short 边界补点，发布级缺口更清晰且已有最小证据起点。
  - **标准硬度**：`requiredRegressionsComplete=false` 与 `evidenceSufficiency!=sufficient` 被收紧为硬阻断，并进入 blocking reasons。
- 还不具备什么
  - **更细粒度的证据门槛**：目前用“是否 long-window”粗粒度阻断，尚未按 changeType 差异化证据要求。
  - **selection 的可判定语义**：已有最小 evidence 起点，但缺少 selection 专属 gate reason/rule 与 required regressions 映射扩面。

## completed delivery in p13
- P13-1 完成了什么
  - `scripts/p13_1_regression_completion.mjs` + `docs/p13-1-regression-completion.md` + 样例 completion（缺项/齐项）+ gate `--regressions` 接入。
- P13-2 完成了什么
  - 更新版 coverage map：`artifacts/examples/p13-2-coverage-map.md`；新增 evidence：`artifacts/evidence/p13-2/20260328T154216Z/*`；短文档：`docs/p13-2-coverage-strengthening.md`。
- P13-3 完成了什么
  - 收紧标准落地：`scripts/p7_2_gate_mvp.sh`（regressions/evidence 硬阻断）+ `docs/p13-3-release-standards-tightening.md` + 样例。

## what is now formally delivered
- regression completion（MVP）
  - schema+generator+落盘 artifacts + gate 读取（可核对/可阻断）。
- strengthened coverage（MVP）
  - selection evidence 起点 + short/long 对照补点 + 更新 coverage map。
- tightened release standards（MVP）
  - regressions/evidence 硬约束 + 明确 blocking reasons。

## remaining gap
- 如果要继续走下一阶段，还差什么
  - **按 changeType 的证据门槛分级**（不是一刀切 long-window）。
  - **selection 门禁工程化**（显式 rule/reason + required regressions 映射 + 更多样例）。
  - **从样例到更接近发布级必跑集合**（覆盖与对照密度继续提升）。
- 为什么属于下一阶段
  - P13 已完成“闭环+补点+收硬”的 MVP 基线；剩余是**分级细化与覆盖扩面工程化**，属于进一步发布级收敛。

## final verdict
- P13 是否可以正式收口
  - **可以**（required regressions 可核对、coverage 有关键补点、标准已收硬为可阻断）。
- 当前成熟度阶段
  - **发布级硬门禁 MVP**：具备可证明的阻断条件与回归完整性闭环，但证据门槛与 selection 门禁仍需细化与扩面。
- 下一步是否建议进入新阶段
  - **建议进入**：下一阶段聚焦“按变更类型分级门槛 + selection 门禁工程化 + 发布级必跑集合扩面”。
