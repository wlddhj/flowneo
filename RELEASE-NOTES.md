# Release Notes

## v0.3.0（2026-08-28）— 双端分发与可配置化

**Codex 端**
- `.codex-plugin/plugin.json` 官方清单 + `AGENTS-flowneo.md` 标记段源——Codex marketplace 一键安装可用（引导级，无 hooks）
- 版本同步工具扩展到 4 处（含 Codex 清单）

**CLI init/remove**
- `flowneo init --claude/--codex/--all --project` 项目级安装：skills 双端复制 + CC hooks 相对路径注册 + Codex AGENTS.md 标记段 + 初始化 .flow-neo/config
- `flowneo remove` 安全卸载：只删 FlowNeo 技能目录、数组级注销 hooks 保留用户项、AGENTS 标记段移除保留用户内容
- mergeHooksSettings 数组级合并——用户既有同事件 hooks 不丢失

**配置系统**
- `.flow-neo/config/plugin.config.json` 五组配置：reminders.perTurn / archive.strategy / lint.routerLimit / schema.strictness / stages.skipDesign+skipReview
- hook 读 config：每轮提醒可关；Router/技能话术感知跳阶段开关（默认 false 保五阶段纪律）

**Schema 校验**
- PostToolUse hook + 章节清单校验（01~05 五工件必填章节，纯 TS 零依赖实现）
- 失败仅 stderr 警告不阻断（exit 0 纪律）

## v0.2.0（2026-08-27）— 多任务并行支持

**多任务模型**
- `.flow-neo/tasks/<slug>/` 取代 `current/` 单活跃区，支持多任务并行
- 会话级绑定 `.flow-neo/sessions/<session-id>.md`，CC 端机制级多会话隔离
- 轻任务零文件化（不入任务系统）；status.md 去 mode 增 slug

**代码层**
- 新增 `src/lib/tasks.ts`：slug 生成 / 绑定读写 / 任务列表 / 7 天清理 / stdin 解析
- `src/lib/router.ts` 重写：按任务寻址、绑定感知注入（有/无绑定/多任务列表三分支）
- 两个 hook 读 stdin session_id；SessionStart 注入 `<FLOWNEO_SESSION>` 块让 01 技能写绑定
- `safe*` 包装兜底 IO 异常；`assertSessionId` 防路径注入

**提示词层**
- Router v2：多任务规则、并行 Red Flags（含「先动手回头再建」「顺手做另一任务」「并行文件冲突」三条）
- 01 技能扩展为任务创建+绑定；05 归档加绑定清理

**文档**
- 技术方案升 v2.2；设计 spec 与实施计划入档

## v0.1.0（2026-08-27）— Claude Code 单端 MVP

**代码层**
- TypeScript 工程（esbuild 零依赖单文件 dist/ 入库）
- `src/lib/{tokens,router,inject,lint}.ts` + `src/hooks/{session-start,user-prompt-submit}.ts`
- `flowneo lint` CLI（Router ≤1500 tokens + 技能 frontmatter 校验）

**提示词层**
- Router 调度核心（分流规则 + 五阶段状态机 + 流转纪律 + Red Flags）
- 5 阶段技能（需求探索 / 四阶设计 / 编码执行 / 代码审查 / 交付归档）
- HARD-GATE 封条（02 设计不齐禁编码、03 表外任务禁实施）

**清单**
- `.claude-plugin/` + `hooks/hooks.json`，本地 marketplace 可安装
