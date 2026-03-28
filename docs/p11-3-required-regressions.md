# P11-3 Required Regression Set（按变更类型的必跑清单，MVP）

目标：
把回归矩阵从“建议模板”推进到“按变更类型的必跑回归集合（checklist）”，并把 P11-2 deep policy disposition 纳入回归要求。

约束：
- deterministic
- 不做 CI/CD 平台
- 不做自动修复

入口（复用既有脚本/证据）：
- gate：`scripts/p7_2_gate_mvp.sh --dir <traceDir>`
- action/workflow：`node scripts/p7_3_signal_to_action.mjs <gate.json>`
- evidence：`artifacts/evidence/p11-1/20260328T070328Z/`（long window baseline）

---

## 1) 变更类型 → 必跑回归集合（MVP）

### A) refresh_cost_config
范围：`A2A_PARENT_REFRESH_MS / A2A_PARENT_SMALL_ALL / A2A_PARENT_RR_K`

必跑：
1) **multi_parent long-window gate baseline**
   - evidence: `artifacts/evidence/p11-1/20260328T070328Z/cases/multi_parent.in.long.gating_effective`
   - 观察重点：
     - `windowedMetrics.attention_req_per_parent`
     - `gateLevel/releaseDisposition`
     - `matrixRuleId/matrixDecisionBasis`
     - `dispositionPolicyVersion` + `matrixDispositionOverride`
   - 通过条件：
     - cost-related reason 不恶化；`attention_req_per_parent` 不上升

2) **multi_parent out-of-range should still fail**
   - evidence: `.../cases/multi_parent.out.long.attention_too_high`
   - 通过条件：
     - 仍为 `FAIL/must_fix_first` 且 rule/basis 不漂（`Rmp1` / `attention_req_per_parent>5`）

可选：
- p7-1 benchmark delta（若本轮实际改了 refresh 策略而非纯文档）

---

### B) same_role_coordination_config
范围：`A2A_OWNER_STALE_MS / A2A_YIELD_WINDOW_MS / same-role handles`

必跑：
1) **same_role long-window stable should not fail**
   - evidence: `.../cases/same_role.in.long.stable`
   - 通过条件：
     - 非 `FAIL/must_fix_first`

2) **same_role long-window yield_high should be must_fix_first (deep policy)**
   - evidence: `.../cases/same_role.out.long.yield_high`
   - 通过条件：
     - `gateLevel=FAIL` 且 `releaseDisposition=must_fix_first`
     - `matrixDispositionOverride!=null` 且 `dispositionReason` 指向 long-window yield 规则

可选：
- short smoke（5 loops）用于快速反馈（不替代 long-window）

---

### C) gate_rule_change
范围：graded gate thresholds / deep disposition overrides / rule id mapping

必跑：
1) **policyVersion consistency**
   - 任意 3 个代表 long-window cases（single/multi_parent/same_role）
   - 通过条件：
     - `dispositionPolicyVersion` 符合预期变更

2) **override drift check**
   - evidence: `same_role.out.long.yield_high` & `multi_parent.out.long.attention_too_high`
   - 通过条件：
     - `matrixDispositionOverride` 仍存在且 from→to 逻辑一致

---

### D) runner_behavior_change
范围：attention/selection/policy/decision/summary/cost 统计等

必跑：
1) **evidence contract check**
   - 对 `artifacts/evidence/p11-1/.../cases/*` 随机取 2–3 个：
     - `summary.json` 可读
     - `p7_2_gate_mvp.sh` 可产出 gate
     - `p7_3_signal_to_action.mjs` 可产出 action
   - 通过条件：
     - 三件套不破坏；输出字段（policyVersion/override/reason）存在

可选：
- 扩展到 index.tsv 的全量 case 扫描（后续阶段）

---

### E) selection_logic_change
范围：multi_parent selection / refresh policy / selection scoring

必跑：
1) **multi_parent selection anomaly guardrail (long)**
   - evidence: `artifacts/evidence/p13-2/20260328T154216Z/cases/multi_parent.out.long.selection_anomaly`
   - 观察重点：
     - `gateReasons(code=selection_churn_high|selection_churn_present|selection_instability)`
     - `matrixRuleId`（Rsel*）+ `matrixDecisionBasis`
     - `keyMetrics.selection.selection_churn_rate` / `parent_switch_count`
   - 通过条件（MVP）：
     - 该 case 必须保持为 `blocked`（selection churn 高必须挡）

2) **multi_parent selection instability contrast (long, observe_only)**
   - evidence: `artifacts/evidence/p15-2/20260328T162510Z/cases/multi_parent_same_role.out.long.selection_instability_mild`
   - 通过条件（MVP）：
     - 该 case 必须保持为 `observe_only`（Rsel2 selection_instability）

2) **multi_parent combo case sanity (long)**
   - evidence: `artifacts/evidence/p11-1/20260328T070328Z/cases/multi_parent_same_role.in.long.controlled`
   - 通过条件：
     - 非 `blocked`

3) **multi_parent in/out baseline (long)**
   - 同 refresh_cost_config 的 in/out 两个 long cases

---

## 2) deep policy disposition 如何进入必跑集合

- 对 `same_role.out.long.yield_high`、`multi_parent.out.long.attention_too_high`：
  - 必须检查 `matrixDispositionOverride` 与 `dispositionReason`，确认 deep policy 在 long window 下仍然生效。
- 对 gate_rule_change：
  - 必须检查 `dispositionPolicyVersion` 漂移是否符合预期。

---

## 3) 输出里如何体现必跑/可选/通过条件

- 本文即 checklist。
- 每类变更明确：必跑 / 可选 / 观察重点 / 通过条件。
