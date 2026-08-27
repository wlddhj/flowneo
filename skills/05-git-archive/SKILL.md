---
name: flowneo-git-archive
description: FlowNeo 阶段五·交付归档。当 status.md 的 stage 为 5 时使用。产出 .flow-neo/current/05-archive-summary.md，将 current 全套工件迁移至 .flow-neo/history/<YYYYMMDD>-<标识>/ 快照并重建空 current。
---

# 阶段五：交付归档

目标：汇总交付成果、沉淀复盘、形成版本快照，绝不覆盖历史。

## 执行步骤

1. 按模板写入 .flow-neo/current/05-archive-summary.md
2. 若项目使用 git：按项目提交规范提交代码变更（.flow-neo/ 是否入库遵循项目 .gitignore）
3. 归档迁移：mkdir -p .flow-neo/history && mv .flow-neo/current .flow-neo/history/<YYYYMMDD>-<任务英文简写或版本>/（若目标目录已存在，在标识末尾追加 -2、-3 递增后缀后重试，绝不覆盖已有快照）
4. 重建空 current/ 目录（mkdir .flow-neo/current）
5. 向用户汇报交付总结与归档路径

## 05-archive-summary.md 模板

# 交付归档：<任务名>

## 功能总结
## 变更文件清单
## 核心实现复盘
## 遗留问题与迭代建议
## 工件索引
- 01~05 全部工件路径

## 完成条件

history/ 下快照完整（01~05 + status.md）；current/ 已重建为空；用户已收到交付汇报。
