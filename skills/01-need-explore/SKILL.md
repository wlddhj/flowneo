---
name: flowneo-need-explore
description: FlowNeo 阶段一·需求探索与任务创建。当判为重任务且尚无对应任务目录时使用。创建 .flow-neo/tasks/<slug>/ 任务、绑定会话、澄清需求，产出 01-need-explore.md 并推进到阶段 2。
---

# 阶段一：需求探索（含任务创建）

目标：创建任务、澄清模糊需求、锁定需求边界、排除无效诉求，杜绝开发中途改需求、漏需求。

## 执行步骤

1. **创建任务**（已存在本会话绑定的任务则跳过本步，直接从步骤 2 开始）：
   - 与用户确认任务名；slug 优先用任务的英文短横线名（如 user-center），用户未提供则由任务名清洗生成（空格/斜杠→`-`；与 .flow-neo/tasks/ 既有目录冲突时追加 -2、-3）
   - 创建 `.flow-neo/tasks/<slug>/status.md`：`task: <任务名>`、`slug: <slug>`、`stage: 1`、`artifacts: []`、`updated: <当前时间>` 五字段
   - 写本会话绑定：从注入的 `<FLOWNEO_SESSION>` 块读 `session_id`，写入 `.flow-neo/sessions/<session_id>.md` 内容 `task: <slug>`；session_id 为 `unknown` 时跳过此步（无绑定机制的环境仍可走任务流程，仅失去多会话隔离）
2. 拆解用户原始需求，提炼核心开发目标
3. 逐项明确：需求边界与不做事项、运行环境与兼容要求、验收标准
4. 存在模糊点时一次性列出全部疑问向用户确认（禁止拆成多轮）；无法确认的给出假设并显式标注
5. 按下方模板写入 `.flow-neo/tasks/<slug>/01-need-explore.md`
6. 更新本任务 status.md：stage: 2，artifacts 追加 01-need-explore.md
7. 用 Skill 工具调用 flowneo-design-plan 进入阶段二

## 01-need-explore.md 模板

# 需求探索纪要：<任务名>

## 用户原始需求
<原文摘录>

## 核心开发目标
- <目标>

## 需求边界与不做事项
- 边界：
- 不做：

## 运行环境与兼容要求
- <环境/版本/兼容>

## 验收标准
- <可验证条目>

## 待确认问题与结论
- Q：<问题> → A：<结论 或 【假设】>

## 完成条件

status.md 已更新至 stage: 2；边界与验收标准已经用户确认或标注假设。
