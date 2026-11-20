# Release Notes

## v0.6.1（2026-11-20）— 三端同步防线 + 编码守则（借鉴 ponytail 工程实践）

**manifest 一致性校验（防 617ed77 类占位符漏改）**
- `flowneo lint` 新增仓库 URI 同值校验：package.json 与两份 plugin.json 的 homepage/repository 归一化（剥 `git+`/`.git`/尾斜杠）后组内互比，漂移即 lint 红并指明文件字段
- 防绕过：URI 字段全缺的 manifest 报错，防删字段后校验空转；JSON 损坏/文件缺失显式报错
- CI 接入 `npm run bump-version -- --check`：5 个 manifest 版本不一致即失败（版本校验从脚本能力升级为门禁）

**03/04 技能编码守则**
- 03 新增「编码守则」节：最小实现阶梯（复用 → 标准库 → 已装依赖 → 最小新代码）、新依赖须 02 背书、懒于方案不懒于变更、不可削减清单
- 新增 `flowneo-shortcut: <限制>, <何时升级>` 临时取舍注释规范：实现层已知限度写注释并登记 03 记录，与「设计未覆盖回写 02」显式划界
- 04 审查清单新增第 5 项 shortcut 收割：核对变更中 flowneo-shortcut 注释与 03 记录登记闭环，报告模板增「shortcut 收割」小节

## v0.6.0（2026-11-13）— ZCode 三端支持

**零结构改动接入 ZCode**
- ZCode（智谱 AI 编码 Agent）内建 Claude Code 插件兼容层，FlowNeo 现有产物直接可装：`.claude-plugin/plugin.json` 清单识别 + `type: command` hooks 执行器 + `${CLAUDE_PLUGIN_ROOT}` 变量注入 + stdin snake_case alias + `hookSpecificOutput.additionalContext` 输出契约，全项命中
- 不新增 `.zcode-plugin/` 目录、不改 CLI——符合「无冗余」设计理念
- 用户实测 5 项全过：添加市场安装 / SessionStart Router 注入 / UserPromptSubmit 每轮提醒 / 五阶段技能触发（新任务→创建 .flow-neo/ 工件）/ PostToolUse 工件章节校验

**文档**
- README：三端声明（简介/平台差异表）+ ZCode 安装方法（含 session 快照注意事项）

**已知平台差异**
- ZCode 项目级 hooks 配置当前不执行（其安全策略），FlowNeo 走插件分发不受影响

## v0.5.0（2026-11-13）— 阶段二设计确认门禁

**02 设计技能（确认门禁主流程）**
- 02 落盘后不再自动进入编码：统一输出待确认问题清单（编号文本一次全量亮出 + 关键分叉以结构化选择题收答案）停等用户；无疑问/无分叉时同样停等，明示「无疑问，请确认方案」
- 用户全部确认后回写 02「## 确认记录」节落痕（确认时间/逐条结论/最终裁决），确认引发调整的先修订正文再落痕，随后推进 stage: 3 进入编码
- 步骤 1 断点识别：02 已存在且无确认记录 → 直接重新输出清单——会话恢复不绕过门禁
- status 停留 stage: 2 凭「artifacts 含 02 + 无确认记录」识别待确认态，五字段结构零变更

**03 编码技能（开工守门）**
- HARD-GATE 校验 02「确认记录」落痕方可编码；缺失时输出设计要点补确认后继续——升级前进行中的旧任务不硬阻断
- skipDesign=true 快速通道豁免确认守门

**双端同步**
- router.md 与 AGENTS-flowneo.md（Codex 端镜像）三处流转纪律同步：五阶段表、流转纪律第 1 条、上下文纪律断点续作（lint 双端一致性校验通过）
- 结构化选择题话术工具自适应：具备 AskUserQuestion 类工具时用之（每批 ≤4 题、超限分批），无此工具的平台按清单逐条文本回复

**文档**
- README：五阶段流程补「用户确认门禁」环节、差异表加「设计确认」维度

**后续项（不属于本版）**
- marketplace/npm 安装缓存刷新后新门禁才在既有环境生效；确认等待无超时提醒策略（依赖用户主动回复）

## v0.4.1（2026-09-01）— 设计档位制 3 项 Minor 修复

**Schema 校验**
- 档位标注识别正则锚定行首 `/^档位[：:]\s*精简/m`——防正文内联引用「档位：精简」字样误切档（之前子串匹配会误判，现在只在「档位：精简」独占一行时切档）；补防回归测试

**02 设计技能**
- 模板加「第三阶二选一，删除不适用整节」指引——防模型全量/精简两份第三阶标题都写
- 轻量简化启动路径加 02 自判档位（按 01 信号）+ 工件头部标注「02 自判（无 01 判定）」——不再默认全量

**文档**
- README 完善：npm/GitHub 徽章、删过时「待公开」标注、体现设计档位制、差异表与配置表同步
- 仓库地址回填：`huangjian` 占位 → `wlddhj/flowneo` 实际地址（package.json / .codex-plugin / README 三处）

**后续项（不属于本版）**
- CI 自动化、Token A/B 实测（vs Superpowers）、`archive.strategy` 生效（v0.3.0 预留字段）、bump-version 脚本扩展含 package-lock.json

## v0.4.0（2026-08-28）— npm 正式发包 + 设计技能增强

**npm 发包**
- npm 包 `flowneo` 正式可装：`npx flowneo init / lint / remove` 项目级安装与安全卸载
- `files` 白名单——只发布运行所需（dist / skills / hooks / config / 双端清单 / AGENTS），排除 src / tests / docs / scripts
- `prepublishOnly` 复用 `verify`——publish 前强制重建 dist + git diff 卡点，防源码与产物漂移
- `repository` / `homepage` / `license` / `keywords` 元信息补全（GitHub 地址为占位，建仓后回填）

**设计质量增强（02 技能）**
- 自我评审环节：四阶交叉自检清单
- 用户确认门：不确定项一次性确认，避免方案带着未决项进入编码

**后续项（不属于本版）**
- GitHub 仓库创建与双端 marketplace 发布、CI、`npm publish` 实际执行（注意：默认 registry 若为 npmmirror 等镜像，发布须显式指定官方源 `npm login --registry https://registry.npmjs.org/` + `npm publish --registry https://registry.npmjs.org/`）

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
- lint.routerLimit 与 schema.strictness 已接线生效（lint 命令与 PostToolUse hook 实读配置）；archive.strategy 为预留字段（v0.3.0 暂未生效）

**Schema 校验**
- PostToolUse hook + 章节清单校验（01~05 五工件必填章节，纯 TS 零依赖实现）
- 失败经 `hookSpecificOutput.additionalContext` 注入警告不阻断（exit 0 纪律）——真机验证发现 -p 会话 stderr 不可见，已从 stderr 通道切换

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
