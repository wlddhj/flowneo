---
name: flowneo-need-explore
description: FlowNeo 阶段一·需求探索。当任务为完整（full）模式且处于阶段 1 时使用。澄清模糊需求、锁定边界与验收标准，产出 .flow-neo/current/01-need-explore.md 并将 status.md 推进到阶段 2。
---

# 阶段一：需求探索

目标：澄清模糊需求、锁定需求边界、排除无效诉求，杜绝开发中途改需求、漏需求。

## 执行步骤

1. 初始化：若 .flow-neo/current/status.md 不存在则创建，写入 mode: full、stage: 1、task: <一句话任务名>、artifacts: []、updated: <当前时间>
2. 拆解用户原始需求，提炼核心开发目标
3. 逐项明确：需求边界与不做事项、运行环境与兼容要求、验收标准
4. 存在模糊点时一次性列出全部疑问向用户确认（禁止拆成多轮）；无法确认的给出假设并显式标注
5. 按下方模板写入 .flow-neo/current/01-need-explore.md
6. 更新 status.md：stage: 2，artifacts 追加 01-need-explore.md
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
