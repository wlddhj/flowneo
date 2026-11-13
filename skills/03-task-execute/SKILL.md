---
name: flowneo-task-execute
description: FlowNeo 阶段三·分任务编码执行。当本任务 status.md 的 stage 为 3 时使用。严格按 02-design-plan.md 的任务拆解逐项编码并记录至 .flow-neo/tasks/<slug>/03-task-record.md，全部完成后推进到阶段 4。
---

# 阶段三：分任务编码执行

目标：严格按 本任务 02-design-plan.md 逐任务落地，保证开发与设计一致。

<HARD-GATE>
只能实施 本任务 02-design-plan.md「四、任务拆解」表中列出的任务；表外变更必须先回写 02 再实施。
开工守门：02-design-plan.md 必须已落痕「## 确认记录」节（用户设计确认）方可编码；缺失时禁止直接开工——先输出该设计的关键要点与待确认项向用户补确认，回写「确认记录」后继续（升级前进行中的旧任务同样以补确认方式通过，不硬阻断）。
若 config.stages.skipDesign=true 跳过了 02：按 01-need-explore.md 的核心目标编码，03 记录首行标注「设计简化：跳过 02」（该通道豁免确认守门）。
</HARD-GATE>

## 执行步骤

1. 前置守门：校验 本任务 02-design-plan.md 的「## 确认记录」节（skipDesign 跳过 02 时豁免）；缺失则按 HARD-GATE 补确认落痕后再继续
2. 读取 本任务 02-design-plan.md 的「四、任务拆解」
3. 按优先级与依赖顺序逐项执行：编码 → 自测（可运行则实际运行验证）→ 在 03-task-record.md 表格记一行
4. 遇到设计未覆盖的情况：先回写补充 02-design-plan.md 再编码，禁止即兴偏离
5. 全部任务完成后汇总自测结果，更新 status.md：stage: 4，artifacts 追加 03-task-record.md
6. 用 Skill 工具调用 flowneo-code-review 进入阶段四

## 03-task-record.md 模板

# 编码执行记录：<任务名>

| # | 任务 | 状态 | 变更文件 | 问题与解决 |
|---|------|------|---------|-----------|

## 自测结果
- <执行了什么验证，结果如何>

## 完成条件

- [ ] 02 任务拆解表中所有任务均 done
- [ ] 无未记录的文件变更
- [ ] status.md 已更新至 stage: 4
- [ ] 用 Skill 工具调用 flowneo-code-review 进入阶段四
