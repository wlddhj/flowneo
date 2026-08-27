<SUBAGENT-STOP>
如果你是被派发执行具体任务的子代理，忽略本 Router，直接完成你的任务。
</SUBAGENT-STOP>

# FlowNeo 工程工作流调度核心（Router）

你在 FlowNeo 工程工作流约束下工作。每次接到用户需求时先执行：读取 .flow-neo/current/status.md（存在则恢复断点续作；不存在则按下述规则判定模式并创建该文件）。

## 任务分流（首个需求判定一次，结果写入 status.md）

- **轻量（light）**：改 Bug、改配置、补注释、局部微调（影响 ≤2 个文件、无设计变更）→ 直接编码 → 简易自查 → 交付。除 status.md 一行外不产生任何工件。
- **复杂（full）**：新功能、模块重构、数据表/接口设计、多文件变更 → 严格走五阶段。
- 用户说「走轻量/完整流程」时立即切换并更新 status.md。

## 五阶段（full 模式串行推进，禁止跳阶段）

| 阶段 | 调用技能（Skill 工具） | 产出工件（.flow-neo/current/） |
|---|---|---|
| 1 需求探索 | flowneo-need-explore | 01-need-explore.md |
| 2 方案设计 | flowneo-design-plan | 02-design-plan.md |
| 3 编码执行 | flowneo-task-execute | 03-task-record.md |
| 4 代码审查 | flowneo-code-review | 04-code-review.md |
| 5 交付归档 | flowneo-git-archive | 05-archive-summary.md |

## 流转纪律（硬约束）

1. 上一阶段工件未写入 .flow-neo/current/，禁止进入下一阶段
2. 每次阶段或模式变更，同步更新 status.md（mode/stage/task/artifacts/updated 五字段）
3. 编码严格依据 02-design-plan.md 的任务拆解，禁止自由发挥；设计未覆盖时先补设计再编码
4. 工件仅写入 .flow-neo/，文件名固定禁止改名，不预建空文件（阶段完成才落盘）
5. 任务交付后由阶段 5 将 current/ 迁移至 history/<YYYYMMDD>-<标识>/ 快照，绝不覆盖历史

## Red Flags——出现以下念头立即停下（它们是合理化借口，不是理由）

| 念头 | 现实 |
|---|---|
| 「需求很清楚，不用做需求探索」 | 清楚是错觉；至少要落边界与验收标准 |
| 「这个改动简单，直接写」 | 简单与否由分流规则判定，不是由兴奋度判定 |
| 「设计文档可以编码后再补」 | 禁止；02 是编码唯一依据，先设计后编码 |
| 「任务太小，不用记 03 记录」 | full 模式下所有任务逐项记录，无例外 |
| 「先跳过审查，用户等着要」 | 审查是交付前提，缩报告可以、跳审查不行 |
| 「我先看看代码再决定走哪个流程」 | 先判定模式写入 status.md，再动任何工具 |

## 上下文纪律

- 超长文件/日志/Diff 只保留结论与关键片段（各 ≤50 行），禁止整段复读工具输出
- 会话恢复时凭 status.md 与现有工件断点续作，不重跑已完成阶段

> 用户显式指令（CLAUDE.md、直接要求）优先级高于本 Router；冲突时服从用户并说明。
