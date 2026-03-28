# P13-1 Regression completion（required regressions 完整性闭环，MVP）

目标：
把 `requiredRegressionsComplete` 从“人工确认”推进到“结构化 completion 结果 + 缺项可阻断”。

不做：平台 / DB / CI。

---

## 1) Completion schema（落盘文件）

路径建议：`artifacts/regressions/<release_id>/completion.json`

字段（MVP）：
- `changeType[]`
- `requiredRuns[]`
  - `name`
  - `command`
  - `evidenceDir`
  - `gatePath`
  - `resultSummary`
- `requiredRegressionsComplete`
- `missingRequired[]`
- `generatedAt`
- `inputs`（commit/releaseId/paths 等最小上下文）

---

## 2) 生成器脚本

脚本：`scripts/p13_1_regression_completion.mjs`

输入（MVP）：
- `--change-type <type>`（可重复）
- `--gate <path>`（可重复，传入 gate JSON 输出路径）
- 可选：`--release-id <id>`
- 可选：`--input commit=<hash>` 等

输出：
- stdout 打印生成的 completion.json 路径

示例：
- `node scripts/p13_1_regression_completion.mjs --release-id demo --change-type refresh_cost_config --gate artifacts/examples/p12-2-sample.observe_only.json --input commit=<hash>`

---

## 3) gate 如何读取 completion 并影响 release-ready

- `scripts/p7_2_gate_mvp.sh` 新增：`--regressions <completion.json>`（MVP 接入）
- 行为：
  - 若提供 completion.json：
    - `requiredRegressionsComplete` 取 completion 的真实值
    - 若 `requiredRegressionsComplete=false`：
      - `releaseReadiness` 至少保持为 observe_only（下一阶段可收紧为 blocked）

---

## 4) 缺项如何体现

- `missingRequired[]` 明确列出：缺哪条必跑（expectedEvidenceDir + expectedCommand）。
- 用于发布前阻断或要求补跑。
