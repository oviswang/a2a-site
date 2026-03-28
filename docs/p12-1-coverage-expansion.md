# P12-1 覆盖面扩展（coverage map + 边界补齐，MVP）

目标：
- 把当前 evidence / gate / workflow / required regressions 的覆盖面做成一张清楚的 coverage map。
- 优先补齐发布级门禁最关键的边界缺口：`human_boundary`、`health`，并覆盖组合 mode：`multi_parent+same_role` 的 long-window 样例。

---

## 1) Coverage map（snapshot）

- 覆盖图文件：`artifacts/examples/p12-1-coverage-map.md`
- 数据来源（仅基于 repo 现状）：
  - P10-1 evidence：`artifacts/evidence/p10-1/20260328T064554Z/`（short/medium；single/multi_parent/same_role）
  - P11-1 evidence：`artifacts/evidence/p11-1/20260328T070328Z/`（long；single/multi_parent/same_role + combo in_range）
  - deep policy：`scripts/p7_2_gate_mvp.sh`（P11-2）
  - required regressions：`docs/p11-3-required-regressions.md`

---

## 2) 当前缺口（发布级优先）

覆盖图中标为 release-critical 但无 evidence 的重点缺口：
- `human_boundary` 在组合 mode（multi_parent+same_role）缺 case（尤其 long/medium/short）
- `health` 在组合 mode（multi_parent+same_role）缺 case（尤其 long/medium/short）

---

## 3) 本轮补齐了哪些缺口

新增 long-window 边界 cases（组合 mode）：
- `multi_parent_same_role.out.long.human_required`
- `multi_parent_same_role.out.long.act_fail`

位置：`artifacts/evidence/p12-1/20260328T072524Z/`
- 每个 case 固定产出：`summary.json` + `gate.json` + `signal_to_action.json`（并带最小 decision/act traces）
- 索引：`matrix.json` + `index.tsv`

---

## 4) 哪些缺口现在已足够支撑发布级门禁

- human_boundary / health 的 long-window 边界样例已具备：可用于 P12-2 定义“必须挡”的发布级门禁语义，并在 checklist 中作为必跑证据。

---

## 5) 仍留给后续的缺口

- selection 类的更系统覆盖（尤其组合 mode 的异常选择路径）
- 更多 window（short/medium）下的边界 case 对照（用于对比“短窗可观察 vs 长窗必挡”）
- runner behavior change 的更大范围 contract 扫描（目前仍为 MVP）
