# P17-1 Matrix global expansion（MVP）

目标：
把 deeper graded matrix 从“关键路径覆盖”推进到更接近全域覆盖的状态（先减少灰区，不做引擎）。

产物：
- 缺口报告：`artifacts/examples/p17-1-matrix-gap-report.json`
- 扩展后的矩阵：`artifacts/examples/p17-1-deeper-graded-matrix.json`

---

## 1) 基于三个出口反推缺口（结果）

来源：
- completion REQUIRED_RUNS：`scripts/p13_1_regression_completion.mjs`
- release checklist：`docs/p12-release-checklist.md`
- gate change-type 分支：`scripts/p7_2_gate_mvp.sh`

结论（MVP）：
- 当前这三处的 changeType **已经全部入矩阵**（见 gap report：notInMatrix=[]）。
- 需要扩展的不是 changeType 名字本身，而是 **mode/window/evidenceType 的覆盖厚度**（尤其 medium 与 combo）。

---

## 2) 本轮新增的 matrix coverage（MVP）

在 `p17-1-deeper-graded-matrix.json` 中新增 cells：
- selection_logic_change / multi_parent+same_role / medium / selection_case_present（observe_only）
- gate_rule_change / multi_parent+same_role / medium / boundary_case_present（observe_only）
- runner_behavior_change / multi_parent+same_role / medium / boundary_case_present（observe_only）

---

## 3) gate 最小接入（本轮）

- 不新增引擎；本轮仅把 matrix 作为“覆盖语言”扩展。
- readiness 差异仍由已有 gate 分支体现（same_role partial→observe_only、gate_rule 缺 boundary→blocked、runner partial→observe_only）。

---

## 4) 后续方向（不在本轮）

- 将 matrix JSON 真正作为 gate 的查表输入（逐步替代硬编码分支）。
