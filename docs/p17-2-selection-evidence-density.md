# P17-2 Selection evidence density（MVP）

目标：
把 selection 从“有问题谱/层次/若干样例”推进到“证据更密、rule↔evidence 更可追溯”的治理域。

新增 evidence set：
- `artifacts/evidence/p17-2/20260328T171419Z/`

---

## 1) 本轮提升的 evidence 密度

### short/medium/long 对照（同类问题）
- selection_churn_present（Rsel0）
  - short：`sel.Rsel0.multi_parent.short.churn_present`
  - medium：`sel.Rsel0.multi_parent.medium.churn_present`
  - long：`sel.Rsel0.multi_parent.long.churn_present`

### multi_parent vs combo 对照
- selection_instability（Rsel2）
  - multi_parent：`sel.Rsel0.multi_parent.long.churn_present`（长窗下进入 instability 观察层）
  - combo：`sel.Rsel2.combo.long.instability_mild`

### 阻断型对照
- wrong_parent_spinning（Rsel1）
  - long：`sel.Rsel1.multi_parent.long.wrong_parent_spinning`

---

## 2) rule ↔ evidence 映射增强

本轮在 evidence 索引中增加了：
- `supportsRule`（Rsel0/Rsel1/Rsel2）
- `problemType`

索引文件：
- `matrix.json`（结构化）
- `index.tsv`（便于快速 grep/diff）

---

## 3) 仍不足的部分（后续）

- 更细的 parent_switch_high（低 churn_rate）边界样例
- short vs long 对照在 combo mode 下的密度

---

## 4) 为什么对长期治理重要

- 从单点样例推进到“同类问题跨窗口/跨模式”的可追溯证据集，使 Rsel 层次更稳、更不靠直觉。
