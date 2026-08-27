# 移植到新平台 Harness（Checklist）

FlowNeo 当前支持 Claude Code 与 OpenAI Codex 双端。未来接入新 harness（Cursor / Kimi / Pi 等）时参考此 checklist。

## 不变量（移植前必须满足）

1. 技能内核 `skills/` 纯 Markdown，不依赖任何平台运行时
2. Router 内容（`skills/_router/router.md`）是注入源，不绑定平台机制
3. 工件路径 `.flow-neo/tasks/<slug>/` 与 `.flow-neo/sessions/<session-id>.md` 是约定，不依赖平台文件系统差异

## 适配层 checklist

- [ ] 平台技能目录：新平台的 skills 标准目录（如 `.cursor/skills/`、`.kimi/skills/`）
- [ ] 持久指令通道：新平台是否有 CLAUDE.md / AGENTS.md 等价文件承载 Router？还是需 hook 注入？
- [ ] 会话钩子：新平台有 SessionStart / UserPromptSubmit 等价 hook 吗？有则做机制级绑定，无则降级为引导级
- [ ] 插件清单：新平台的 plugin.json / interface 规范
- [ ] stdin 解析：新平台 hook stdin 的 session_id 字段名（若不同需在 `parseSessionId` 适配）
- [ ] 分发：marketplace 命令还是文件级安装？

## 参考实现

- **Claude Code 适配层**：`hooks/hooks.json` + `src/hooks/*.ts`（SessionStart / UserPromptSubmit，机制级）
- **Codex 适配层**：`.codex-plugin/plugin.json` + AGENTS.md 标记段（引导级）

新平台接入时，先建 `<platform>/` 适配目录，复用 `skills/` 内核。
