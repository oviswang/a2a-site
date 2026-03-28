# P10-1 Evidence Matrix（轻量证据集，MVP）

目标：
把推荐区间与门禁语义背后的证据，从零散 examples 推进为一个**轻量、可复跑、可引用、可 diff** 的 evidence matrix。

约束：
- 不做压测平台
- 复用既有入口：gate / signal-to-action（必要时用 wrapper 组织样本）

---

## 1) 证据集目录结构

本轮 evidence matrix 目录：
- `artifacts/evidence/p10-1/<ts>/`
  - `matrix.json`：索引（case 列表 + 元信息 + artifacts 路径）
  - `cases/<caseId>/`
    - `summary.json`：固定结构 summary（含 counts/cost）
    - `gate.json`：`scripts/p7_2_gate_mvp.sh` 输出（含 scenarioMode/matrixKey/signalClass 等）
    - `signal_to_action.json`：`node scripts/p7_3_signal_to_action.mjs gate.json` 输出（含 workflow/validation）
    - （可选）`*.decision.json`：用于 same_role/coordination 类信号

---

## 2) Case 命名规则（MVP）

`<mode>.<point>.<window>.<caseMeaning>`

- mode：`single | multi_parent | same_role`
- point：`in_range | out_of_range`
- window：`short | medium`（本轮用 5 / 20 loops 代表）

---

## 3) 本轮覆盖范围

- modes：single / multi_parent / same_role
- points：in_range / out_of_range（对 cost 或 coordination 做对照）
- windows：short(5) / medium(20)

---

## 4) 支撑关系（examples → claims）

- 推荐区间（P9-1）：
  - refresh/cost（A2A_PARENT_REFRESH_MS / SMALL_ALL / RR_K）通过 multi_parent in/out 对照体现 attention cost 与 gateLevel 变化
  - same-role（OWNER_STALE_MS / YIELD_WINDOW_MS）通过 same_role in/out 对照体现 coordination reason 与 gateLevel 变化

- 门禁矩阵语义（P9-2）：
  - gate 输出携带 `scenarioMode/matrixKey` 与 reason `signalClass/matrixDisposition`，可直接解释 mode 差异。

- 验证回路（P9-3）：
  - signal_to_action 输出携带 validation workflow，可将 case 的 FAIL/WARN 指向标准 re-run/compare 路径。

---

## 5) 为什么这是 evidence matrix 而不是零散 examples

- 有统一索引（matrix.json）
- 有统一 case 命名与目录结构
- 每个 case 固定产出三件证据：summary + gate + signal_to_action
- 可复跑、可 diff，且能引用到推荐区间/矩阵语义/验证回路三个层面
