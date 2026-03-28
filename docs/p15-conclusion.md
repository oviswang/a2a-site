# P15 阶段定稿（最终版）

> 基线：仅基于 `a2a-site` 当前真实产物（P15-1 deeper graded matrix + gate hooks；P15-2 selection 扩面 evidence+规则；P15-3 默认必跑集合收敛到 completion 映射）。

## p15 conclusion
- P15 现在完成了什么
  - 把发布治理从“粗分级+单点 selection + 扩面回归”推进到更稳定的三件套：**更细门槛矩阵语言（changeType×mode×window×evidenceType）**、**selection 覆盖变厚（新增问题类型+短长/组合对照+新 Rsel 规则）**、以及 **默认必跑集合更稳（selection 一挡一放进入 completion 基线）**。
- 已经具备了什么（分级矩阵 / selection 覆盖 / 默认必跑集合）
  - **分级矩阵**：有 doc+JSON 的 deeper matrix，并在 gate 中开始体现 evidenceType（window partial vs sufficient、selection evidence presence）对 readiness 的差异。
  - **selection 覆盖**：新增 `selection_instability`（Rsel2）+ short/long + combo 对照 evidence set，形成可长期对照的“该挡/该观察”两类基线。
  - **默认必跑集合**：completion REQUIRED_RUNS 将 selection instability 对照升级为 required，使 selection 变更不再只靠单一 anomaly guardrail。
- 还不具备什么
  - **更系统的矩阵执行**：deeper matrix 仍以 MVP 分支落地，尚未覆盖更多 changeType/mode/window 的全量规则自动套用。
  - **selection 更广问题谱**：目前覆盖 churn/instability/空转型样例，仍缺更多 selection drift/错 parent 类型与更密对照。
  - **默认必跑集合的全域收敛**：本轮重点收敛 selection；其它 changeType 的默认必跑仍可进一步统一与收紧。

## completed delivery in p15
- P15-1 完成了什么
  - `docs/p15-1-deeper-graded-matrix.md` + `artifacts/examples/p15-1-deeper-graded-matrix.json` + gate hooks + 样例（同 changeType 不同 window readiness 不同）。
- P15-2 完成了什么
  - `docs/p15-2-selection-coverage.md` + `artifacts/evidence/p15-2/20260328T162510Z/*` + gate 新增 `selection_instability`/`Rsel2` + 回归/清单对照项。
- P15-3 完成了什么
  - `docs/p15-3-default-required-regressions.md` + completion REQUIRED_RUNS 收敛（selection 对照项升级为 required）+ missing/complete 样例。

## what is now formally delivered
- deeper graded matrix（MVP）
  - 更细门槛定义（doc+JSON）+ gate 对 window/selection evidence 的最小应用。
- expanded selection coverage（MVP）
  - 多问题类型+对照 evidence set + 新 gateReason/Rsel 规则。
- default required regressions（MVP）
  - selection 变更默认必跑集合更稳（completion 映射层面）。

## remaining gap
- 如果要继续走下一阶段，还差什么
  - **矩阵化门槛扩展**：把更多 changeType/mode/window/evidenceType 纳入可执行规则（减少手写分支）。
  - **selection 证据与规则继续做厚**：扩更多 selection 问题类型与对照，并把它们系统纳入默认必跑集合。
  - **默认必跑集合全域收敛**：把更多 changeType 的默认必跑项收敛到 completion+checklist 的同一基线。
- 为什么属于下一阶段
  - P15 已完成“更细语言+更厚 selection+更稳 selection 基线”的 MVP 收敛；剩余是覆盖与自动化套用的规模化深化。

## final verdict
- P15 是否可以正式收口
  - **可以**（三条主线均形成可引用、可复查、可执行的 MVP 基线）。
- 当前成熟度阶段
  - **发布治理矩阵化 MVP+**：门槛语言已更细、selection 域更厚且有稳定对照、默认必跑开始收敛，但仍需把矩阵与默认必跑扩展到更全域。
- 下一步是否建议进入新阶段
  - **建议进入**：下一阶段聚焦“矩阵规则覆盖扩展 + selection 全域收敛 + 默认必跑集合对齐”。
