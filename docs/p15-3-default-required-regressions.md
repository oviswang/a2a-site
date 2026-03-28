# P15-3 Default required regressions（发布级默认必跑集合，MVP）

目标：
把 required regressions 推进为更稳定、更难漏的“默认发布基线”：
- completion REQUIRED_RUNS 映射更完整
- selection 不再只有单一 anomaly guardrail
- 缺项能明确体现“默认必跑项缺失（mode/window）”

---

## 1) 默认必跑集合收紧（本轮落地）

优先 changeType：
- `refresh_cost_config`
- `same_role_coordination_config`
- `runner_behavior_change`
- `selection_logic_change`
- `gate_rule_change`

其中本轮新增收紧点：
- `selection_logic_change`：新增一条默认必跑对照项
  - `selection instability contrast (long) must stay observe_only`
  - 目的：让 selection 变更不再只靠“一个必须挡的异常 case”，而是有“一挡一放”的稳定基线。

---

## 2) optional → required（MVP）

- selection instability 对照：从“扩面 evidence”升级为 selection_logic_change 默认必跑项（completion 映射）。

---

## 3) completion 如何体现默认基线

- REQUIRED_RUNS 为每条必跑项带：`requiredMode` / `requiredWindow`
- missingRequired 增强：`requiredMode` / `requiredWindow` / `whyBlocking`

---

## 4) 下一步（不在本轮）

- 把 checklist 与 required regressions 文档的“必跑集合”进一步统一为同一份默认基线（减少双写）。
- 对 runner_behavior_change 从 spot check 扩到更系统的 contract 扫描。
