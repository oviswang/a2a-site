# P11-1 Evidence Expansion（long window，MVP）

目标：
把 evidence matrix 从 short/medium 样本推进到包含 **long window** 的更可信证据集（仍保持轻量、可复跑、可 diff）。

本轮新增：
- window 档位：`long`（60 loops）
- 覆盖模式：`single` / `multi_parent` / `same_role`
- 轻量组合：`multi_parent+same_role`

证据目录：
- `artifacts/evidence/p11-1/20260328T070328Z/`
  - `matrix.json` / `index.tsv`
  - `cases/*`（每个 case 三件套：summary/gate/signal_to_action，必要时含 decision traces）

---

## 本轮新增的 long-window cases（概要）

- single
  - `single.in.long.pass`
  - `single.out.long.mostly_wait`

- multi_parent
  - `multi_parent.in.long.gating_effective`
  - `multi_parent.out.long.attention_too_high`

- same_role
  - `same_role.in.long.stable`
  - `same_role.out.long.yield_high`

- combo
  - `multi_parent_same_role.in.long.controlled`

---

## 哪些旧结论因此更可信

- cost/refresh 推荐区间与 cost gate 语义：
  - long window 下 `attention_req_per_parent` 与 `skippedByFreshCache` 更稳定，减少短窗波动对结论的影响。

- same_role coordination 语义：
  - long window 下 `yield_rate` 更能区分“偶发让出”与“持续性争抢”，支撑 deep matrix 的比例/持续性判断。

---

## 哪些结论仍然只是 MVP 级证据

- 这些 long-window 仍是轻量样本集（非真实线上长跑），用于建立“更稳的对照”，但不等价于生产环境统计。

---

## 为什么 long window 对 P11-2 / P11-3 关键

- P11-2（深策略落地）需要更稳定的 ratio/window 证据来决定 observe_only vs must_fix_first 的默认处置。
- P11-3（必跑清单）需要知道哪些验证在 long window 下更可靠、哪些只适合 short smoke。
