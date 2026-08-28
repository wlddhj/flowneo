---
name: flowneo-code-review
description: FlowNeo 阶段四·代码自查审查。当本任务 status.md 的 stage 为 4 时使用。对照 本任务 02-design-plan.md 审查全部变更（设计一致性/逻辑边界/规范/性能安全），修复问题并产出 .flow-neo/tasks/<slug>/04-code-review.md。
---

# 阶段四：代码自查审查

目标：自查漏洞、规范代码、对齐设计、修复隐性 Bug。所有代码变更必须审查。

```
NO REVIEW CLOSED WITHOUT ROOT CAUSE NAMED
```

> 若 `.flow-neo/config/plugin.config.json` 的 `stages.skipReview=true`，本阶段可跳过：直接用 Skill 工具调用 flowneo-git-archive，并在 05 归档记录标注「跳过审查」。

## 审查清单（逐项执行）

1. 设计一致性：实现与 本任务 02-design-plan.md 逐条比对，偏差要么修复、要么回写设计
2. 逻辑与边界：空值、越界、并发、资源释放、异常路径
3. 代码规范：命名、重复代码、死代码、无用依赖
4. 性能与安全：N+1 查询、超大内存占用、注入/XSS/敏感信息硬编码
5. 修复发现的问题并逐条记录

## 具体批评 vs 泛化指责（对照）

❌ 泛化：这段代码可读性差
✅ 具体：router.ts:23 `pick` 闭包每次 new RegExp，可提为常量 RE_TASK

❌ 泛化：错误处理不够
✅ 具体：tasks.ts:19 readBinding 未校验 sessionId 含 `/`，可能路径注入

❌ 泛化：性能有问题
✅ 具体：listTasks 对每个任务 new RegExp 2 次，可常量化

## 04-code-review.md 模板

# 代码审查报告：<任务名>

## 审查范围
<变更文件清单>

## 审查结果
| 类别 | 问题 | 严重度 | 处理 |
|------|------|-------|------|

## 设计一致性比对
- <逐条结论>

## 完成条件

清单 5 项全部执行；发现的问题全部处理；status.md 更新至 stage: 5；用 Skill 工具调用 flowneo-git-archive。
