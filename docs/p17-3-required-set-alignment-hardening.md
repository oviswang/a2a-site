# P17-3 Required set alignment hardening（MVP）

目标：
强化 REQUIRED_RUNS 与 docs/checklist/completion/selection evidence 的对应关系，减少人工同步漂移。

---

## 1) Single source of truth

- 默认必跑集合（default required set）事实源：
  - `scripts/p13_1_regression_completion.mjs` → `REQUIRED_RUNS`

约束：
- docs/checklist **不得增删默认必跑项**，只能：
  - 引用 REQUIRED_RUNS 的 evidenceDirSuffix
  - 补充解释与字段检查点

---

## 2) 本轮对齐薄弱点扫描（MVP）

- 新增只读对齐检查脚本：`scripts/p17_3_alignment_check.mjs`
  - 输出：`artifacts/examples/p17-3-alignment-check.json`
  - 目的：发现 REQUIRED_RUNS 在 docs/checklist 中缺失的 evidence 关键路径（允许 `.../` 简写）。

---

## 3) 本轮修正点（MVP）

- gate_rule_change：
  - 修正 required regressions 文档，使必跑项对齐 REQUIRED_RUNS（boundary human_required must stay blocked）。

---

## 4) 真实样例

- 可直接运行：`node scripts/p17_3_alignment_check.mjs`
  - `hasDrift=false` 表示 REQUIRED_RUNS 与 docs/checklist 在 evidence 关键路径上无明显漂移。

---

## 5) 后续（不在本轮）

- 把 checklist 中的“命令行”也完全对齐 REQUIRED_RUNS（含 --change-type）。
- 在 completion missingRequired 中增加 defaultRequired=true 的标记（更强约束）。
