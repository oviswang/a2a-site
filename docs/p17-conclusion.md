# P17 阶段定稿（最终版）

> 基线：仅基于 `a2a-site` 当前真实产物（matrix 扩展 JSON+gap report、selection 密集证据集与索引、required-set drift check 机制）。

## p17 conclusion
- P17 现在完成了什么
  - 把发布治理从“更一致”推进到“更全、更密、更不漂”：**矩阵覆盖向全域推进（补 medium/combo/evidenceType cells + gap report）**、**selection 证据加密（短/中/长 + multi_parent/combo 对照 + rule↔evidence 显式映射）**、以及 **required set 对齐机制强化（drift check + 文档对齐）**。
- 已经具备了什么（矩阵全域覆盖 / selection 证据密度 / 对齐机制）
  - **矩阵覆盖**：有 gap report 证明 changeType 已入矩阵，扩展重点转向 mode/window/evidenceType；新增 matrix cells 覆盖 medium/combo 的关键灰区口径。
  - **selection 密度**：新增 selection evidence set（Rsel0 short/medium/long；Rsel2 combo long；Rsel1 long）并带 `supportsRule/problemType` 索引，rule↔evidence 可追溯。
  - **对齐机制**：引入只读 alignment check 脚本，能发现 docs/checklist 漂移；修正 gate_rule_change 文档使其与 REQUIRED_RUNS 对齐；对齐后 hasDrift=false。
- 还不具备什么
  - **矩阵的查表执行**：matrix 仍主要是口径/覆盖语言，尚未系统性作为 gate 的查表输入（仍以分支为主）。
  - **selection 更细边界与更多谱系**：证据更密但仍可继续扩展更多中间态边界样例与问题谱厚度。
  - **对齐机制覆盖更广**：当前 drift check 是显著漂移探测（MVP），后续可扩到命令/字段级对齐。

## completed delivery in p17
- P17-1 完成了什么
  - `docs/p17-1-matrix-global-expansion.md` + `artifacts/examples/p17-1-matrix-gap-report.json` + `artifacts/examples/p17-1-deeper-graded-matrix.json` + 样例。
- P17-2 完成了什么
  - `docs/p17-2-selection-evidence-density.md` + `artifacts/evidence/p17-2/20260328T171419Z/*`（matrix/index + cases）+ 样例摘要。
- P17-3 完成了什么
  - `scripts/p17_3_alignment_check.mjs` + `docs/p17-3-required-set-alignment-hardening.md` + `artifacts/examples/p17-3-alignment-check.after.json` + 文档对齐修正。

## what is now formally delivered
- global matrix expansion（MVP）
  - gap-driven 扩展（medium/combo/evidenceType）与可引用 matrix JSON。
- dense selection evidence（MVP）
  - rule↔evidence 可追溯的密集 selection 证据集（跨窗口/跨模式对照）。
- hardened required-set alignment（MVP）
  - drift check 机制 + 关键文档对齐，减少口径漂移。

## remaining gap
- 如果要继续走下一阶段，还差什么
  - **matrix → gate 查表化**：逐步将 matrix JSON 作为 gate 的判定输入，减少硬编码分支。
  - **selection 证据继续加密**：更多 medium/combo 边界样例与更细阈值对照。
  - **alignment 更强约束**：扩展 drift check 覆盖到命令/字段/required vs supplemental 分层。
- 为什么属于下一阶段
  - P17 已完成“覆盖扩展/证据加密/对齐机制 MVP”；剩余是把这些机制进一步工程化成更自动、更强约束的长期维护形态。

## final verdict
- P17 是否可以正式收口
  - **可以**（三条主线均形成可引用、可复查、可维护的 MVP 基线）。
- 当前成熟度阶段
  - **发布治理一致性与可追溯性 MVP+**：矩阵覆盖更接近全域、selection 证据更密、required set 更不漂，但仍需 matrix 查表化与更强对齐约束。
- 下一步是否建议进入新阶段
  - **建议进入**：下一阶段聚焦 matrix 查表化 + selection 边界加密 + alignment 约束加强。
