# P20-2 Selection midstate hardening（MVP）

目标：
在 P19-2 的基础上，把 **medium / combo / 临界带**再压实一轮，减少 Rsel0/Rsel2/Rsel1 之间的解释空间。

新增 evidence set：`artifacts/evidence/p20-2/20260328T190408Z/`

---

## 1) 本轮补的最值钱中间带

### A) medium instability（更稳定的 observe-only 口径）
- `sel.harden.medium.instability.low.observe`
- `sel.harden.medium.instability.mid.observe`

### B) medium combo 对照（同指标在 combo 下）
- `sel.harden.medium.combo.instability.mid.observe`

### C) long 临界带（near-threshold observe vs over-threshold block）
- `sel.harden.long.churn_near_threshold.observe`（near threshold，但仍 observe：Rsel2）
- `sel.harden.long.churn_over_threshold.block`（明显越界：Rsel1 / must_fix_first）

---

## 2) 复用 Rsel 体系（无新增 rule）

- medium：作为 observe-only 基线（不轻易升级为 must_fix_first）
- long：用 near-threshold 与 over-threshold 对照钉住 Rsel2→Rsel1 跨越边界

---

## 3) 索引增强（更适合 required/checklist 引用）

- `index.tsv` 明确：
  - problemType / supportsRule / selectionMetrics / windowClass / mode / boundaryBand
  - 并保留 ruleId 与 reasons，方便 rule↔evidence 反查

---

## 4) 对后续 required / checklist / matrix 的帮助

- medium/combo 的 observe-only 样例可以作为“默认解释源”（supplemental/observe baseline）
- long 临界对照可作为 required 中“跨越门槛的证据点”引用
