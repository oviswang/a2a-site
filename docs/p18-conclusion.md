# P18 阶段定稿（最终版）

> 基线：仅基于 `a2a-site` 当前真实产物（table-driven gate、selection 边界证据集、alignment check 语义增强）。

## p18 conclusion
- P18 现在完成了什么
  - 把发布治理从“有矩阵/有证据/有对齐”推进到更可执行、更少灰区、更硬约束：**gate 对少数高频 changeType 开始查表执行**、**selection 边界态证据加密（Rsel1 vs Rsel2 临界对照）**、以及 **alignment 从路径级提升到更接近语义级检查**。
- 已经具备了什么（matrix 执行面 / selection 边界密度 / alignment 语义约束）
  - **matrix 执行面**：release 输出包含 `tableDriven` 诊断（enabled/matchedCells/decision），并对 allowlist changeType 通过 matrix cell 影响 readiness（有真实样例证明 short→observe_only、long→ready）。
  - **selection 边界密度**：新增 selection 边界 evidence set（switch高但churn低→Rsel2、churn临界→Rsel1、short提示、combo对照），使 Rsel 层次边界更可复查。
  - **alignment 语义约束**：alignment check 能解析 REQUIRED_RUNS item 并检查 mode/window/selection 关键词（在可检查范围内），降低“看似对齐但语义松动”的风险。
- 还不具备什么
  - **matrix 全面查表化**：目前仅对少数 changeType 启用查表且仍有 fallback 分支，尚未把 matrix 作为主判定面全域替代硬编码。
  - **selection 更细中间态谱系**：边界更清晰但仍可继续扩展更多 medium/combo 中间态与更密对照。
  - **alignment 更强一致性约束**：当前仍是只读检查（MVP），后续可扩展到命令/字段/required-vs-supplemental 分层校验。

## completed delivery in p18
- P18-1 完成了什么
  - `docs/p18-1-matrix-table-driven.md` + `scripts/p7_2_gate_mvp.sh` 查表逻辑 + 样例输出（runner short vs long）。
- P18-2 完成了什么
  - `docs/p18-2-selection-boundary-density.md` + `artifacts/evidence/p18-2/20260328T180934Z/*` + 边界样例摘要。
- P18-3 完成了什么
  - `docs/p18-3-alignment-hardening.md` + `scripts/p17_3_alignment_check.mjs` 增强 + 对齐报告样例。

## what is now formally delivered
- table-driven matrix execution（MVP）
  - gate 对少数 changeType 的查表执行与可审计诊断输出。
- dense selection boundary evidence（MVP）
  - Rsel1/Rsel2 临界边界对照证据集与可检索索引。
- hardened semantic alignment（MVP）
  - 语义级 drift check（evidence + mode/window + selection keywords）。

## remaining gap
- 如果要继续走下一阶段，还差什么
  - **matrix 主判定面化**：扩大查表覆盖 changeType 与 cell 匹配策略，逐步收敛/减少硬编码 fallback。
  - **selection 边界继续加密**：补更多中间态（尤其 medium/combo）并把 rule↔evidence 映射更系统化。
  - **alignment 约束更硬**：把检查扩到命令/字段级，并引入 required/supplemental 分层一致性。
- 为什么属于下一阶段
  - P18 已完成“可执行查表 + 边界证据加密 + 语义检查 MVP”；剩余是扩大覆盖与更强自动化约束的规模化深化。

## final verdict
- P18 是否可以正式收口
  - **可以**（三条主线均形成可执行、可复查、可维护的 MVP 基线）。
- 当前成熟度阶段
  - **发布治理执行面与一致性 MVP++**：已具备可审计的查表执行、selection 边界对照与更强 alignment 检查，但仍需扩展到更全域的查表与更硬约束。
- 下一步是否建议进入新阶段
  - **建议进入**：下一阶段聚焦“matrix 主判定面化 + selection 中间态加密 + alignment 命令/字段级约束”。
