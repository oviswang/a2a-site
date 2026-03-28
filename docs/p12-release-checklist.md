# P12 Release Checklist（MVP，可执行）

目的：
在发布前，用最短路径回答：
- **能不能放**（ready / observe_only / blocked）
- **为什么**（blocking reasons / 证据不足 / regressions 未完成）

入口与统一语义：
- Gate（含 release-ready 字段）：`scripts/p7_2_gate_mvp.sh --dir <traceDir>`
- Release-ready 语义定义：`docs/p12-2-release-gate-semantics.md`
- Required regressions（按变更类型）：`docs/p11-3-required-regressions.md`
- Coverage map（覆盖与缺口）：`artifacts/examples/p12-1-coverage-map.md`

注意（MVP 约束）：
- `requiredRegressionsComplete` 当前默认 unknown/false（脚本不会自动变 true）。
- 因此本 checklist 的“放行”需要**人工确认本次变更对应的必跑项已执行**。

---

## 0) 发布前最短执行路径（所有变更类型通用）

1) 确认变更类型（见下方 A–E）。
2) 按该变更类型执行“必跑项”。
3) 对每个必跑项：
   - 运行 gate
   - 检查 release-ready 字段：
     - `releaseReadiness`
     - `releaseBlockingReasons[]`
     - `evidenceSufficiency`
     - `matrixDispositionOverride` / `dispositionReason`
4) 汇总结论：
   - 任一 `blocked` → **不得发布**
   - 无 blocked 但存在 `observe_only` → 仅允许观察期发布（若业务允许）

---

## A) refresh_cost_config
范围：`A2A_PARENT_REFRESH_MS / A2A_PARENT_SMALL_ALL / A2A_PARENT_RR_K`

必跑项（MVP）：
1) multi_parent long in-range sanity
   - dir: `artifacts/evidence/p11-1/20260328T070328Z/cases/multi_parent.in.long.gating_effective`
   - cmd: `scripts/p7_2_gate_mvp.sh --dir <dir>`
   - 观察项：`windowedMetrics.attention_req_per_parent`、`gateLevel`、`releaseDisposition`
   - 放行条件：无 blocked；cost 相关不恶化

2) multi_parent long out-of-range guardrail
   - dir: `.../cases/multi_parent.out.long.attention_too_high`
   - cmd: `scripts/p7_2_gate_mvp.sh --dir <dir>`
   - 观察项：`matrixRuleId/matrixDecisionBasis`、`matrixDispositionOverride`、`dispositionReason`
   - 阻断条件：若该 case 不再 `blocked`（放宽 guardrail）→ **不得发布**

建议跑：
- p7-1 benchmark（当本次确实改动 refresh 策略行为时）

---

## B) same_role_coordination_config
范围：`A2A_OWNER_STALE_MS / A2A_YIELD_WINDOW_MS / handles`

必跑项（MVP）：
1) same_role long stable should not be blocked
   - dir: `artifacts/evidence/p11-1/20260328T070328Z/cases/same_role.in.long.stable`
   - cmd: `scripts/p7_2_gate_mvp.sh --dir <dir>`
   - 放行条件：非 blocked

2) same_role long yield_high must remain blocked (deep policy)
   - dir: `.../cases/same_role.out.long.yield_high`
   - cmd: `scripts/p7_2_gate_mvp.sh --dir <dir>`
   - 必查字段：`matrixDispositionOverride`、`dispositionReason`、`releaseBlockingReasons`
   - 阻断条件：该 case 变为非 blocked（削弱深策略）→ **不得发布**

---

## C) gate_rule_change
范围：graded thresholds / deep disposition overrides / rule mapping

必跑项（MVP）：
1) blocked boundary must stay blocked
   - dir: `artifacts/evidence/p12-1/20260328T072524Z/cases/multi_parent_same_role.out.long.human_required`
   - cmd: `scripts/p7_2_gate_mvp.sh --dir <dir>`
   - 阻断条件：非 blocked 或 blocking reasons 不包含 `human_action_required`

2) policyVersion & override drift audit (spot check)
   - dirs: `single.out.long.mostly_wait`, `same_role.out.long.yield_high`, `multi_parent.out.long.attention_too_high`
   - cmd: run gate on each
   - 观察项：`dispositionPolicyVersion`、`matrixDispositionOverride`、`dispositionReason`

---

## D) runner_behavior_change
范围：runner 选择/attention/policy/summary/cost 统计

必跑项（MVP）：
1) evidence contract spot check
   - pick 2–3 dirs from:
     - `artifacts/evidence/p11-1/20260328T070328Z/cases/*`
     - `artifacts/evidence/p12-1/20260328T072524Z/cases/*`
   - cmd:
     - `scripts/p7_2_gate_mvp.sh --dir <dir>`
     - `node scripts/p7_3_signal_to_action.mjs <gate.json>`
   - 放行条件：三件套可生成；release-ready 字段存在；无异常 blocked

---

## E) selection_logic_change
范围：multi_parent selection / refresh policy / scoring

必跑项（MVP）：
1) selection anomaly guardrail (long)
   - dir: `artifacts/evidence/p13-2/20260328T154216Z/cases/multi_parent.out.long.selection_anomaly`
   - cmd: `scripts/p7_2_gate_mvp.sh --dir <dir> --change-type selection_logic_change`
   - 必查字段：
     - `gateReasons`（selection_churn_high/present）
     - `matrixRuleId`（Rsel*）+ `matrixDecisionBasis`
     - `keyMetrics.selection.*`
   - 阻断条件：该 case 变为非 blocked（削弱 selection 门禁）

2) combo long sanity
   - dir: `artifacts/evidence/p11-1/20260328T070328Z/cases/multi_parent_same_role.in.long.controlled`
   - cmd: `scripts/p7_2_gate_mvp.sh --dir <dir> --change-type selection_logic_change`
   - 放行条件：非 blocked

3) multi_parent long in/out baseline
   - 同 refresh_cost_config 的两项

---

## 放行/阻断判定（统一）

- **blocked**：任何必跑项输出 `releaseReadiness=blocked` → 不得发布
- **observe_only**：无 blocked，但存在 observe_only（或 evidenceSufficiency=partial）→ 仅允许观察期发布
- **ready**：所有必跑项满足 ready 的条件，且人工确认必跑项已执行
