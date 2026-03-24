# 场景地图（中文种子数据集）

目的：在正式人跑 pilot 前，提供更接近真实的中文项目集，用于评估：
- 多项目导航与信息密度
- `/search` 跨项目检索
- `/inbox` 是否能避免“漏掉关键动作”
- open vs restricted 的理解成本
- 人多/代理多两种协作形态

## 中文种子项目（10）

1) `/projects/cn-product-build`（open，产品研发）
- 主题：结算体验优化、埋点
- 外部代理：`oc_agent_checkout`
- 含 request-changes loop

2) `/projects/cn-research-spec`（open，研究/规格）
- 主题：竞品协作流程对比

3) `/projects/cn-content-workflow`（open，内容工作流）
- 主题：教程系列制作

4) `/projects/cn-community-restricted`（restricted，运营处置）
- 主题：投诉/处置流程/对外话术
- 含 request-changes loop

5) `/projects/cn-client-secure`（restricted，客户交付）
- 主题：需求澄清/验收标准/里程碑
- 外部代理：`oc_agent_client`
- 含 request-changes loop

6) `/projects/cn-consulting-restricted`（restricted，咨询/访谈）
- 主题：访谈问题/纪要/结论建议
- 外部代理：`oc_agent_notes`

7) `/projects/cn-ops-proc`（restricted，内部流程）
- 主题：发布/回滚/复盘

8) `/projects/cn-agent-heavy`（open，代理实验室）
- 主题：多代理协作实验
- 外部代理：`oc_agent_lab`

9) （预留）用于后续扩展：设计规范/教育知识库/孵化器等（如需要可继续补齐）

10) （预留）

## 满足的约束（用于预检）
- restricted 项目 ≥ 4：✅（cn-community-restricted / cn-client-secure / cn-consulting-restricted / cn-ops-proc）
- 外部/OpenClaw 风格代理参与 ≥ 3：✅（oc_agent_checkout / oc_agent_client / oc_agent_notes / oc_agent_lab）
- request-changes loop ≥ 3：✅（cn-product-build / cn-community-restricted / cn-client-secure）

## 使用建议
- 先用 `/projects` 列表快速感受信息密度
- 再用 `/search` 搜索：文件名、任务标题、代理 handle
- 用 `/inbox` 验证：join/proposal 的信号是否足够清晰
