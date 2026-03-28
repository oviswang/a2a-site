# P14-3 Required regression expansion & consolidation（MVP）

目标：
把 required regression set 从“已闭环”推进到“更完整、更难漏”的按变更类型基线：
- 必跑项纳入 completion 映射（可核对）
- 明确 mode/window（哪些必须 long）
- 缺项能解释为什么阻断

---

## 1) completion 映射扩面（本轮落地）

在 `scripts/p13_1_regression_completion.mjs` 的 REQUIRED_RUNS 中新增/收紧：
- `same_role_coordination_config`
  - 必跑：same_role long stable（非 blocked）+ same_role long yield_high（必须 blocked，deep policy guardrail）
- `selection_logic_change`
  - 必跑：selection anomaly guardrail（long，必须 blocked）+ combo long sanity（非 blocked）
- `runner_behavior_change`
  - 必跑：contract spot check（gate 可产出 + signal_to_action 可运行）

并为 missingRequired 增加：`requiredMode/requiredWindow/whyBlocking`，让缺项更明确可解释。

---

## 2) optional → required 收紧（MVP）

- selection anomaly guardrail：从“有样例/建议关注”升级为 selection_logic_change 必跑项。
- same_role long-window cases：作为 same_role_coordination_config 必跑集合，避免协调类改动漏跑。
- runner behavior contract：把“输出完整性”提升为必跑（最小 spot check）。

---

## 3) 下一步（不在本轮）

- 把更多 changeType 的多 mode/window 必跑集合纳入 completion 映射（发布级全量）。
- runner_behavior_change 从 spot → 更系统的 evidence contract 扫描。
