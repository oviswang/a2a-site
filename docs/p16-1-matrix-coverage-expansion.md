# P16-1 Matrix coverage expansion（MVP）

目标：
把 deeper graded matrix 从关键分支扩展到更完整覆盖，减少发布治理灰区（same_role coordination / gate rule / boundary evidence）。

产物：
- `artifacts/examples/p16-1-deeper-graded-matrix.json`

---

## 1) 本轮扩展维度

- changeType：新增
  - `same_role_coordination_config`
  - `gate_rule_change`
- mode：覆盖
  - `same_role`
  - `multi_parent+same_role`
- window：明确引入
  - `medium`（只允许 observe_only，不作为 release-ready 证据）
- evidenceType：强化
  - `boundary_case_present`（gate_rule_change 必须）
  - `selection_case_present`（延续 P15-1 对 selection 的强约束语言）

---

## 2) 新增/补齐的关键 cells（MVP）

- same_role_coordination_config
  - same_role + long_window：release-ready 的最低硬证据
  - same_role + medium(short_or_medium)：仅 observe_only（不满足 ready）

- gate_rule_change
  - multi_parent+same_role + long + boundary_case_present：release-ready 的最低硬证据
  - multi_parent+same_role + long_window（但无 boundary evidence）：视为不足（必须 blocked）

---

## 3) gate 最小接入（本轮）

- `same_role_coordination_config`：
  - long-window 才允许 ready；medium 只能 observe_only
- `gate_rule_change`：
  - 需要 boundary_case_present + long-window，否则 blocked

---

## 4) 为什么最能减少灰区

- same_role coordination 的“medium 是否够”成为明确规则（只能 observe_only）。
- gate rule change 的“仅跑 long-window 是否够”被收紧为必须有边界 evidence。
