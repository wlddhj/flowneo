---
name: flowneo-git-archive
description: FlowNeo 阶段五·交付归档。当本任务 status.md 的 stage 为 5 时使用。产出 05-archive-summary.md，将本任务目录迁移至 .flow-neo/history/<YYYYMMDD>-<slug>/ 快照，清理会话绑定并重建空任务位。
---

# 阶段五：交付归档

目标：汇总交付成果、沉淀复盘、形成版本快照，绝不覆盖历史，不影响其他进行中任务。

```
NO ARCHIVE WITHOUT SNAPSHOT CLEAN
```

## 执行步骤

1. 按模板写入本任务目录的 05-archive-summary.md
2. 若项目使用 git：按项目提交规范提交代码变更（.flow-neo/ 是否入库遵循项目 .gitignore）
3. **按 `config.archive.strategy` 切换归档迁移行为**（读 `.flow-neo/config/plugin.config.json` 的 `archive.strategy`，缺省 `prompt`）：
   - `auto`：直接执行归档迁移（同原步骤 3 行为）——`mkdir -p .flow-neo/history && mv .flow-neo/tasks/<slug> .flow-neo/history/<YYYYMMDD>-<slug>/`（若目标目录已存在，在 slug 末尾追加 -2、-3 递增后缀后重试，绝不覆盖已有快照）
   - `manual`：**不迁移**，仅写 05-archive-summary.md 落盘；提示用户「archive.strategy=manual，任务目录保留在 tasks/，需手动迁移至 history/」；跳过步骤 4 的绑定清理（迁移后由用户手动执行）
   - `prompt`（缺省）：写完 05 工件后向用户确认「是否归档迁移至 history/？」；确认则按 `auto` 流程执行；拒绝则按 `manual` 处理
4. 清理绑定（仅 `auto` 或 `prompt` 确认迁移时）：删除 .flow-neo/sessions/ 下所有内容为 `task: <slug>` 的绑定文件
5. 向用户汇报交付总结与归档路径；本会话后续需求按新任务重新分流

## 05-archive-summary.md 模板

# 交付归档：<任务名>

## 功能总结
## 变更文件清单
## 核心实现复盘
## 遗留问题与迭代建议
## 工件索引
- 本任务 01~05 全部工件路径

## 完成条件

- [ ] history/<YYYYMMDD>-<slug>/ 下快照完整（01~05 + status.md）
- [ ] 引用该任务的 sessions/*.md 绑定文件已清理
- [ ] 其他 tasks/ 任务未受影响
- [ ] 用户已收到交付汇报
