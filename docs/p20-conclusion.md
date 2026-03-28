# P20 阶段定稿（最终版）

> 基线：仅基于 `a2a-site` 当前真实产物（coverage gap report + refresh_cost matrix-primary、selection midstate hardening evidence set、required weakening detection）。

## p20 conclusion
- P20 现在完成了什么
  - 把治理从“主轴已立（P19）”推进到更可用的覆盖密度与一致性硬度：**做出可审计的 coverage gap report**、**补齐 refresh_cost_config 的 matrix-primary 覆盖**、**压实 selection 的 medium/combo/临界带**、并把 alignment 推进到 **required 被写弱可检测**。
- 已经具备了什么（覆盖 / selection midstate / 一致性硬约束）
  - 覆盖：gap report 明确 top 缺口与优先级；refresh_cost_config 进入 table-driven allowlist，matrix-primary 更稳定且可审计样例可复查。
  - selection midstate：medium/combo 基线 + long 临界对照（near-threshold observe vs over-threshold block）降低灰区。
  - 一致性硬约束：required vs supplemental 最小分层（REQUIRED_RUNS=required）+ 弱化检测（requiredWeakeningInChecklist）能更早暴露“required 被写松”。
- 可使用状态
  - **可用于发布治理日常跑**：对关键 changeType 已有 matrix-primary 轨道、selection 解释链条、alignment 能抓命令/字段/弱化漂移；后续优先可用化而非继续拆阶段。

## completed delivery in p20
- P20-1
  - `artifacts/examples/p20-1-gap-report.json` + refresh_cost_config matrix-primary allowlist + 可复查样例与短文档。
- P20-2
  - `artifacts/evidence/p20-2/...` 中间带 evidence set（medium/combo/临界对照）+ 样例摘要 + 短文档。
- P20-3
  - alignment check 增强 required weakening detection + 文档 + drift 样例。

## what is now formally delivered
- coverage expansion（MVP）
  - gap report + refresh_cost_config matrix-primary 路径与样例。
- selection midstate hardening（MVP）
  - medium/combo/临界带证据链与索引。
- consistency hardening（MVP）
  - required 弱化可检测（只读）。

### baseline（应冻结）
- gate：matrix-first + allowlist（含 refresh_cost_config）
- matrix：p17-1 deeper graded matrix 的现有 cell 集（含 refresh_cost_config 的门槛语义）
- evidence：p19-2/p20-2 selection 证据集
- alignment：p20-3 consistency hardening check（命令/字段 + required 弱化检测）

## next-step policy
- **不再继续拆 P21/P22…**。
- 后续工作方式改为：
  - baseline freeze（锁定上述能力与产物）
  - docs/runbook cleanup
  - release-ready usage guide（如何选 changeType、如何选 evidence、如何解读 tableDriven 与 alignment 报告）
  - bugfix / gap-driven patch only（只因真实问题小修补缺口）
- 为什么应收束
  - 当前已具备可跑的治理闭环；继续拆阶段会把精力从“可用化/可运营”转移到“无限扩规划”。

## final verdict
- P20 可以正式收口：**可以**。
- 这条治理线应进入“可使用优先、阶段冻结”状态：**是**。
- 下一步建议：只做收束与可用化，不再扩新阶段：**建议**。
