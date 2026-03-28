# P18-3 Alignment hardening（语义级对齐，MVP）

目标：
把 alignment check 从“路径级”推进到更接近“语义级”：
- evidence 路径是否缺失
- requiredMode/requiredWindow（在能检查时）
- selection 关键词（Rsel/selection_*）存在性

不做：完美 parser / 自动生成系统。

---

## 1) 事实源（single source of truth）

- `scripts/p13_1_regression_completion.mjs` → `REQUIRED_RUNS`

---

## 2) 本轮增强的检查层面

在 `scripts/p17_3_alignment_check.mjs`：
- 解析 REQUIRED_RUNS 的 item：`name/evidenceDirSuffix/requiredMode/requiredWindow`
- 检查 docs/checklist：
  - evidence path（允许 `.../` 简写）
  - mode/window（对需要严格检查的 changeType）
  - selection 关键词存在性（selection_logic_change）

---

## 3) MVP 约束

- 对 selection_logic_change/gate_rule_change：允许 mode/window 省略（通常由章节语义隐含），避免过度误报。
- 对 same_role_coordination_config/runner_behavior_change：mode/window 更建议显式写清，check 会更严格。

---

## 4) 真实样例

- 运行：`node scripts/p17_3_alignment_check.mjs` 输出 `artifacts/examples/p17-3-alignment-check.json`
- 示例输出：`artifacts/examples/p18-3-alignment-check.sample.json`

---

## 5) 后续（不在本轮）

- 增加对 run name 的更强匹配（当前仍以 evidence/mode/window/keywords 为主）。
- 引入 required vs supplemental 分层校验。
