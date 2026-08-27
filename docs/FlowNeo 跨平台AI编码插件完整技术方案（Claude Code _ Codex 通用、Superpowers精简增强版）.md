# FlowNeo 跨平台AI编码插件技术方案 v2.2（Claude Code / Codex 通用、Superpowers 精简增强版）

> **修订记录**
> - v2.2（2026-08-27）：多任务并行支持——`.flow-neo/tasks/<slug>/` 取代 `current/` 单活跃区；新增会话级绑定 `sessions/<session-id>.md`（CC 机制级多会话隔离）；轻任务零文件化；status.md 去 mode 增 slug；Router/技能话术全链路切换。
> - v2.1（2026-08-27）：①适配层与工具链确定采用 **TypeScript**（esbuild 零依赖单文件产物，运行时仅依赖 Node ≥18）；②修正 Codex 端为**官方插件体系**（`.codex-plugin/plugin.json` + `codex plugin marketplace`，v2.0「无插件市场」表述过时），但 Codex 无 hooks 能力的结论不变；③新增双端**一键安装命令**与 `npx flowneo` 兜底入口；④仓库结构按「Markdown 技能内核 + TypeScript 适配层」重组。
> - v2.0（2026-08-27）：依据可行性评估全面修订。①修正双平台目录与机制为 2026 官方标准（SKILL.md 目录式结构、AGENTS.md 常驻、真实 hooks 体系）；②新增「常驻调度核心 Router + 持续注入」机制，对抗长会话流程漂移；③自动化承诺降级为可实现话术（机制级 / 引导级分级标注）；④Token 效果由百分比宣称改为可测量验收标准；⑤迭代路径调整为「Claude Code 单端先行 → Codex 平移」；⑥全文去重收敛。
> - v1.0（2026-08-27）：初稿。

## 一、项目定位（最终定稿）

### 1. 产品形态

**跨平台标准 Agent 技能插件**，原生兼容 **Claude Code** 与 **OpenAI Codex** 双平台。

- **Claude Code 端**：Skills + 会话 Hooks（SessionStart / UserPromptSubmit，经插件 `hooks/hooks.json` 自动注册）+ `.claude-plugin` 官方插件体系分发
- **Codex 端**：Skills + `.codex-plugin/plugin.json` 官方插件清单（声明技能目录，`hooks` 为空——Codex 无会话钩子能力）+ `AGENTS.md` 标记段承载 Router 常驻
- **核心形态**：**单一技能内核源（纯 Markdown）+ TypeScript 零依赖适配层，经双端官方插件体系分发**。双平台 SKILL.md 格式已趋同（均遵循 agentskills.io 风格标准），一套内容双端安装、双端生效。

不属于独立 CLI、不属于 VSCode 插件、不属于自研 Agent 框架。

### 2. 核心定义

Superpowers 本质是跨平台技能约束框架，价值在于流程纪律，但存在重注入、常驻 Prompt 体积大、无任务分级、流程一刀切的问题。

FlowNeo 定位：**轻量、双平台原生安装、精简持续注入的 Superpowers 升级版平替插件**。保留完整软件工程工作流与流程纪律，通过「精简 Router 常驻 + 技能懒加载 + 轻重任务分流」控制 Token 消耗。

### 3. 解决的核心痛点

- **原版 Superpowers 通病**：SessionStart 重注入、常驻 Prompt 体积大、简单修改也走全流程、Token 消耗高、无任务分级
- **Claude Code 原生短板**：无标准化工程流程、编码随意、无完整设计/审查闭环、交付不规范
- **Codex 原生短板**：默认无固定研发工作流、上下文管控弱、复杂项目迭代规范性差

### 4. 核心差异化

**双平台原生安装 + 精简五阶段工程闭环 + 结构化四阶设计 + 常驻 Router 精简持续注入 + 轻重任务分流 + 常驻 Token 硬预算可测**

一句话：**FlowNeo 一套插件通吃 Claude Code / Codex，以约 2K tokens 的精简常驻注入保住流程纪律（不漂移、不跳阶段），以懒加载与轻重分流压低总消耗，且设计流程比 Superpowers 更结构化、更落地。**

## 二、双平台适配规范（按 2026 官方标准）

### 1. 平台机制对照表

| 能力 | Claude Code | OpenAI Codex |
|---|---|---|
| 技能目录 | `.claude/skills/<name>/SKILL.md` | `.codex/skills/<name>/SKILL.md` |
| 持久指令通道 | CLAUDE.md / SessionStart hook 注入 | AGENTS.md（原生全程常驻，等价持续在场） |
| 每轮动态注入 | UserPromptSubmit hook | 无对应机制，由 AGENTS.md 常驻等效承担 |
| 生命周期钩子 | SessionStart / UserPromptSubmit / PostToolUse / Stop | 无 hooks 能力（插件清单 `hooks` 为空） |
| 插件分发 | `.claude-plugin/plugin.json` + `claude plugin marketplace` | `.codex-plugin/plugin.json` + `codex plugin marketplace` |
| 技能加载方式 | 懒加载（常驻仅注入 name + description） | 懒加载（同一标准） |

### 2. 统一兼容方案

- **单一技能源**：仓库 `skills/` 目录为唯一内核维护点，经双端官方插件清单声明分发（CC `.claude-plugin/plugin.json` / Codex `.codex-plugin/plugin.json` 均指向 `./skills/`）；项目级安装由 `npx flowneo init` 复制到双端标准目录
- **双轨注入**：Claude Code 走 hooks 动态注入（可携带实时状态）；Codex 走 AGENTS.md 标记段静态常驻
- **能力分级声明（诚实口径）**：
  - **机制级**（确定性执行）：仅 Claude Code 端的 hooks 能力——会话启动注入、每轮阶段提醒、后续的工件校验
  - **引导级**（提示词纪律，模型遵循）：双端全部工作流规则、分流判定、截断纪律、归档迁移；Codex 端所有能力均属此级
  - 双端**工作流与工件规范完全一致**，但流程强制性存在客观差异，不做「双端体验完全一致」的承诺
- **统一工件**：`.flow-neo/` 运行时目录双端结构与流转逻辑完全一致

## 三、持续注入机制（v2.0 新增，核心）

### 1. 设计目标

纯提示词的流程约束在长会话中会漂移（跳阶段、漏审查、忘工件落盘）。Superpowers 用重注入对抗漂移，代价是常驻 Token 极高。FlowNeo 同样坚持**持续注入**保纪律，差异在于**注入内容的体积与分层**：

> **Superpowers = 重注入；FlowNeo = 精简 Router 常驻 + 每轮轻提醒 + 技能懒加载，三层分工。**

### 2. 常驻调度核心（Router）

一段固定精简调度指令，**硬性体积上限约 1.5K tokens**，内容包含：

1. **五阶段状态机 + 轻重双分流判定规则**（每阶段一句话职责）
2. **每阶段唯一工件路径**（`.flow-neo/tasks/<slug>/01~05` 固定文件名）
3. **阶段流转纪律**：未产出对应工件不得进入下一阶段；模式与阶段变化必须写入 status.md
4. **启动动作**：读取 `.flow-neo/tasks/<slug>/status.md` 恢复任务上下文（断点续传的统一基座）
5. **上下文截断纪律**：超长文件/日志/Diff 只保留结论与关键片段，工具输出不整段复读

### 3. 状态文件 status.md（持续注入与断点续传的统一基座）

每个任务独立一份，配合 `.flow-neo/sessions/<session-id>.md` 会话绑定实现多任务并行。

`.flow-neo/tasks/<slug>/status.md`，轻量状态文件（20 行以内）：

```markdown
# FlowNeo 任务状态
task: 用户中心重构           # 任务名
slug: user-center-refactor   # 任务 slug（目录名即唯一标识）
stage: 2-design-plan        # 当前阶段（01~05 / -）
artifacts: [01-need-explore.md, 02-design-plan.md(进行中)]
updated: 2026-08-27 11:30
```

- **谁写入**：每次阶段流转 / 模式切换，由当前阶段技能负责更新（技能纪律）
- **谁读取**：CC hooks 注入时读取（动态提醒）；模型启动时读取（断点恢复）；05 归档时作为索引

### 4. 双端注入实现

**Claude Code（三层注入）**

| 层 | 机制 | 内容 | 体积 |
|---|---|---|---|
| 会话层 | SessionStart hook（启动/恢复/压缩后触发） | 完整 Router + status.md 当前状态 | ≤ 1.5K + 状态 |
| 每轮层 | UserPromptSubmit hook（每条用户消息触发） | 极简阶段提醒：「读 status.md → 本次回复遵守当前阶段纪律」 | 约 0.1~0.2K/轮 |
| 技能层 | 平台原生懒加载 | 阶段技能全文按需读取 | 触发时才占用 |

**Codex（AGENTS.md 原生常驻）**

- Router 全文写入项目 `AGENTS.md` 的 FlowNeo 标记段（`<!-- FLOWNEO:BEGIN -->` … `<!-- FLOWNEO:END -->`）
- AGENTS.md 每会话全程在场，**等价于持续注入**；无每轮动态提醒，以 Router 内置的「每轮先读 status.md 再行动」纪律补偿
- **标记段设计**：安装/升级/卸载脚本仅对标记段内的内容做安全增删替换，绝不触碰用户自有 AGENTS.md 内容；无冲突、可回滚

注入实现说明：两个 hook 均为 TypeScript 编写、esbuild 打包的零依赖单文件（`node dist/hooks/*.js`），macOS / Linux / Windows 行为一致，无需平台垫片脚本。

### 5. Token 账本（诚实口径，可测量）

| 常驻项 | 预算 |
|---|---|
| Router（CC：SessionStart 注入 / Codex：AGENTS.md 段） | ≤ 1.5K tokens |
| 5 个技能 name + description 元数据 | ≤ 0.5K tokens |
| 每轮提醒（仅 Claude Code） | ≤ 0.2K tokens/轮 |
| **常驻合计硬上限** | **约 2K tokens**（超限必须精简 Router，由 lint 脚本把关） |

**效果口径**：不做百分比宣称。以同一任务集与 Superpowers 做 A/B 实测，用 Claude Code `/context` 与 Codex 上下文统计对比常驻体积与总消耗，出具实测报告（见「验收标准」）。

## 四、产品能力与核心工作流

### 1. 双流工作流

Router 内置分流判定规则，由模型按需求语义判定（引导级），用户可随时一句话强制切换（「本任务走轻量流程」/「走完整流程」），判定与切换结果写入 status.md：

**轻量任务流**（Bug 修复、配置修改、文本注释、局部微调）：
需求快速确认 → 直接编码落地 → 简易自查 → 交付。**零工件文件**，仅 status.md 记一行。

**复杂任务流**（新功能开发、模块重构、数据表设计、接口开发）：
需求探索 → 结构化四阶方案设计 → 分任务编码执行 → 代码自查审查 → 交付归档。**五工件全落地**。

两套流程完全隔离：杜绝「小任务走全流程高耗 Token、大任务无规范裸开发」两极问题。

### 2. 设计阶段四阶结构化子流程（核心亮点）

设计不再笼统描述，固定四层递进，适配前后端、数据库、架构、业务所有场景，且 **design-plan.md 唯一承载规格+设计**，无重复 spec 文档：

- **子阶段 1：需求规格梳理（定标准）**：核心诉求、需求边界、验收标准、兼容规则、禁止事项、场景约束
- **子阶段 2：功能逻辑设计（定业务）**：模块拆分、业务流程、输入输出、分支场景、异常处理、交互闭环
- **子阶段 3：架构/数据设计（定底层）**：后端——数据表、字段、索引、关联、接口；前端/脚本——架构、组件、状态、目录结构
- **子阶段 4：任务拆解（定落地）**：最小可执行任务、优先级、依赖梳理、开发顺序

### 3. 核心增强能力（相对 Superpowers）

- **双端原生安装 + 单一内核分发**：一套 skills 源，双端标准目录，无自研框架、无平台兼容冗余代码
- **精简持续注入**：Router 常驻 ≤1.5K + 每轮轻提醒，保流程纪律的同时常驻体积硬预算（Superpowers 为重注入）
- **轻重任务智能分流**：轻量任务零文档极速交付（引导级判定 + 手动强制兜底）
- **结构化四阶设计**：规格+功能+数据+任务四层递进，单文档承载，落地性强于「规格/设计分离」
- **引导性上下文节流**：Router 与技能规则内置截断纪律（超长工具输出只留结论与关键 diff）
- **可配置流程开关**：TDD、代码审查、归档、每轮提醒均可按项目配置启停

能力分级说明：以上除 hooks 注入外均为引导级；机制级能力（注入、校验）仅 Claude Code 端。

### 4. MVP 必备能力

- Claude Code 端：5 个阶段技能 + Router + SessionStart/UserPromptSubmit hooks + 安装脚本 + `.flow-neo` 工件体系全流程跑通
- 轻重分流、四阶设计、五工件、status.md 断点恢复可用
- 常驻 Token 实测达标（≤ 2K）

### 5. 正式版增强能力

- 工件 Schema 校验（**机制级，仅 Claude Code**：PostToolUse hook + 校验脚本，可选安装）
- 项目级配置：流程开关、提醒级别、归档策略（`.flow-neo/config/plugin.config.json`）
- 长会话工件化总结：Claude Code / Codex 均有原生压缩能力，FlowNeo 补充「阶段工件即压缩锚点」——压缩后凭 status.md + 工件恢复现场
- 自动化归档增强、变更汇总、开发复盘文档
- Token 账本实测报告（vs Superpowers A/B）

## 五、整体架构（双平台通用）

### 1. 插件仓库结构（Markdown 内核 + TypeScript 适配层）

```text
flowneo/                              # 插件仓库
├── skills/                           # ★ 技能内核源（唯一维护点，双端共用，纯 Markdown）
│   ├── _router/router.md             # 常驻调度核心源（CC→hook 注入；Codex→AGENTS.md 标记段）
│   ├── 01-need-explore/SKILL.md
│   ├── 02-design-plan/SKILL.md       # 四阶结构化设计
│   ├── 03-task-execute/SKILL.md
│   ├── 04-code-review/SKILL.md
│   └── 05-git-archive/SKILL.md
├── src/                              # TypeScript 源码（适配层与工具链）
│   ├── hooks/
│   │   ├── session-start.ts          # Router + status.md 组装注入
│   │   └── user-prompt-submit.ts     # 每轮极简阶段提醒
│   └── cli/
│       ├── init.ts                   # 项目级安装（复制 skills、合并 hooks、AGENTS.md 标记段）
│       ├── remove.ts                 # 安全卸载
│       ├── lint.ts                   # Router 体积 lint（≤1.5K tokens 硬校验）
│       └── validate.ts               # 工件 Schema 校验（正式版，zod）
├── dist/                             # esbuild 零依赖单文件产物（提交仓库，随插件分发）
├── hooks/
│   └── hooks.json                    # CC 插件 hooks 注册（command 调 node dist/hooks/*.js）
├── .claude-plugin/
│   ├── plugin.json                   # CC 插件清单
│   └── marketplace.json              # CC 市场清单
├── .codex-plugin/
│   └── plugin.json                   # Codex 插件清单（"skills": "./skills/"，"hooks": {}）
├── config/plugin.config.json         # 默认配置（安装时复制到 .flow-neo/config/）
├── AGENTS-flowneo.md                 # AGENTS.md 标记段源（npx init 合并用）
├── package.json                      # npm 包（bin: flowneo → dist/cli）
└── docs/
```

### 2. 一键安装与分发（双端官方命令 + npx 兜底）

**用户级安装（推荐，双端官方插件体系，各两条命令）**

```bash
# Claude Code（hooks 经插件内 hooks/hooks.json 自动注册，不改动用户 settings）
claude plugin marketplace add <owner>/flowneo
claude plugin install flowneo@flowneo

# Codex（.codex-plugin 清单声明技能目录）
codex plugin marketplace add <owner>/flowneo
codex plugin install flowneo@flowneo
```

（两端亦支持会话内 `/plugin` 交互安装；均支持从 GitHub 仓库、git URL、本地目录安装，便于内网/离线场景）

**项目级 / 兜底安装（npx，免 marketplace）**

```bash
npx flowneo init                    # 交互式：选择安装端（--claude / --codex）与级别（--project / --user）
npx flowneo init --claude --project # 指定：仅 CC、项目级
npx flowneo remove                  # 安全卸载（AGENTS.md 标记段清理、hooks 注销、技能文件删除）
```

**两种安装模式产物对比**

| 模式 | Claude Code | Codex |
|---|---|---|
| 用户级（marketplace） | 插件系统管理 skills 与 hooks，全局生效，随 marketplace 更新 | 插件系统管理 skills，全局生效 |
| 项目级（npx init） | skills 复制至 `.claude/skills/`，hooks 合并入 `.claude/settings.json` | skills 复制至 `.codex/skills/` |

无论哪种模式，Codex 端的 Router 都需写入项目 `AGENTS.md` 标记段（Codex 无 hooks，AGENTS.md 是唯一常驻通道），由 `npx flowneo init` 自动完成或按插件说明引导。

### 3. 运行时工件目录（双端一致）

```text
项目根/.flow-neo/
├── tasks/                          # 进行中的重任务（每任务独立）
│   └── <slug>/
│       ├── status.md               # 状态文件（注入与断点的基座）
│       └── 01~05 阶段工件（懒生成）
├── sessions/                       # 会话→任务绑定（CC 机制级）
│   └── <session-id>.md
└── history/                        # 历史迭代归档（<YYYYMMDD>-<slug>/，零覆盖）
```

### 4. 四层核心架构

1. **平台适配层**：Claude Code（hooks 注册 + skills）/ Codex（skills + AGENTS.md 标记段），TypeScript 实现，经插件清单或 `npx flowneo` CLI 统一装配，上层无感知平台差异
2. **常驻调度层**：Router + status.md，持续注入的执行体，承担分流判定、阶段纪律、断点恢复（v1「会话调度核心层」的可落地形态）
3. **轻量技能内核层**：5 个阶段技能，懒加载为双平台原生能力，FlowNeo 负责控制元数据与注入体积
4. **Token 治理层**：常驻硬预算 + 技能内截断纪律 + `flowneo lint` 体积卡点 + 可测量账本；机制级辅助（hooks 校验）仅 CC 端可选开启

## 六、标准化阶段输出物规范（双端统一）

所有工件输出至 `.flow-neo/`，文档懒生成（不预建空文件，阶段完成才落盘），轻量任务零文档。

### 1. 五阶段固定工件

| 阶段 | 工件 | 核心内容 | 落盘规则 |
|---|---|---|---|
| 01 需求探索 | 01-need-explore.md | 原始需求拆解、核心目标、边界与不做事项、环境兼容、待确认问题与结论 | 轻量不落盘 |
| 02 四阶设计 | 02-design-plan.md | 需求规格 / 功能设计 / 架构数据设计 / 任务拆解，固定四段 | 轻量仅留核心改动+简易清单 |
| 03 编码执行 | 03-task-record.md | 子任务完成情况、变更清单、问题与方案、自测结果 | 代码为核心，轻量可省 |
| 04 代码审查 | 04-code-review.md | 规范、边界异常、性能安全、设计一致性比对、修复记录 | 简单改动简化，复杂全档 |
| 05 交付归档 | 05-archive-summary.md | 总结、变更汇总、复盘、遗留问题、全工件索引 | 轻量任务不归档 |

### 2. 任务生命周期流转

- **新任务启动**：01 技能创建 `tasks/<slug>/` 并绑定会话；轻任务零文件
- **任务收尾**：05 迁移至 `history/` 并清理绑定
- **历史追溯**：history 目录按 `<YYYYMMDD>-<slug>/` 版本快照回溯；各任务独立互不干扰
- **核心约束**：零覆盖、唯一数据源（design-plan.md 唯一承载设计）、文档懒生成、文件名固定禁止自定义、双端完全一致

## 七、多方能力对比

| 能力项 | 原生 Claude Code | 原生 Codex | 原版 Superpowers | FlowNeo |
|---|---|---|---|---|
| 标准化工程流程 | ❌ 无规范 | ❌ 无固定流程 | ✅ 完整闭环 | ✅ 精简闭环 + 四阶结构化设计 |
| 双平台支持 | — | — | ✅ | ✅ 双端原生目录 + 单一内核 |
| 持续注入防漂移 | — | — | ✅ 但重注入、常驻大 | ✅ 精简分层注入，≤2K 硬预算 |
| 常驻 Token 控制 | ⭐ 中等 | ⭐ 中等 | ❌ 极高 | ✅ 硬预算 + 可测量账本 |
| 任务智能分流 | ❌ 无 | ❌ 无 | ❌ 一刀切全流程 | ✅ 轻重双流 + 手动强制 |
| 结构化分层设计 | ❌ 笼统 | ❌ 笼统 | ⭕ 规格设计分离重复 | ✅ 四阶递进、单文档无重复 |
| 可定制性 | 低 | 低 | 中、规则臃肿 | ✅ 高、配置化 + 标记段安全卸载 |

## 八、技术形态与开发规范（v2.1：TypeScript 工具链）

- **双层技术形态**：技能内核纯 Markdown（平台加载物，双端共用）；适配层与工具链 TypeScript（hooks 注入、安装/卸载、lint、校验）
- **零依赖单文件纪律**：marketplace 安装不执行 npm install，所有 TS 产物经 esbuild 打包为自包含单文件并提交仓库（`dist/`），运行时仅依赖 Node ≥18；Claude Code 经 npm 安装的用户天然满足，其余环境由安装器检测并提示
- **跨平台一致性**：hooks 直调 `node dist/hooks/*.js`，macOS / Linux / Windows 行为一致，无需 superpowers 式 bash/cmd polyglot 垫片
- **官方规范对齐（2026 现状）**：Claude Code——目录式 SKILL.md、插件 `hooks/hooks.json` 自动注册、`.claude-plugin` + marketplace 分发；Codex——`.codex-plugin/plugin.json`（`"skills": "./skills/"`）+ `codex plugin marketplace`，无 hooks 能力（清单 `hooks` 为空，本方案不虚构该平台不存在的机制）；AGENTS.md 全局 + 项目级合并加载
- **平台逻辑隔离**：内核（skills + Router + 工件规范）统一，适配层独立迭代，单端更新不影响另一端
- **降级策略**：无 Node 环境下双端 skills 仍可被识别使用（引导级能力全保留），仅 CC hooks 注入与 npx CLI 不可用，不阻断开发

## 九、迭代开发计划（调整为「单端先行 → 平移」）

### 阶段一：Claude Code 单端 MVP（1~2 天）

- TS 工程搭建：esbuild 构建配置、零依赖单文件产物（dist/）、`node dist/hooks/*.js` 直调验证
- 编写 5 个阶段技能 + Router + status.md 规范
- 实现 session-start / user-prompt-submit 两个 hook（TS）+ `.claude-plugin` 清单与 `hooks/hooks.json`
- `.flow-neo` 工件体系与生命周期跑通；轻重分流与手动强制可用
- **验收**：`claude plugin marketplace add <本地目录>` 本地安装生效；示例任务走通五阶段全工件；中断会话重启后凭 status.md 恢复（机制级）；`/context` 实测常驻 ≤ 2K

### 阶段二：Codex 平移（0.5~1 天）

- `.codex-plugin/plugin.json` 清单 + `codex plugin marketplace` 本地目录安装验证
- `npx flowneo init / remove` CLI（TS）：项目级 skills 复制 + AGENTS.md 标记段安全增删
- 同一任务集在 Codex 端全流程走查
- 产出双端能力差异清单（hooks 相关增强项在 Codex 端降级为引导级）

### 阶段三：完善版（2~3 天）

- npm 发包（`npx flowneo` 正式入口）+ GitHub 仓库双端 marketplace 发布
- 配置开关（提醒级别、流程启停、归档策略）
- 工件 Schema 校验（CC 端 PostToolUse + TS/zod 校验，可选安装）
- Token 账本实测：同任务集 vs Superpowers A/B 报告
- 异常兜底纪律打磨、`flowneo lint` Router 体积把关（≤1.5K tokens）

## 十、风险与对策

- **AGENTS.md 与用户自有内容冲突** → 标记段隔离 + 脚本化安全增删，卸载零残留
- **Router 体积膨胀** → ≤1.5K 硬预算 + lint 脚本卡点
- **模型分流误判**（引导级固有风险）→ 一句话手动强制切换，判定结果透明记录于 status.md
- **每轮注入的累积成本** → 提醒压缩至 ≤0.2K/轮；config 可关闭每轮提醒（以纪律强度换 Token，用户自选）
- **Codex 端无 hooks、强制性弱于 CC** → AGENTS.md 常驻 + status.md 读取纪律 + 阶段工件卡点（无工件不进下一阶段）双重兜底；对外如实标注能力分级
- **平台官方规范变更** → 适配层隔离，仅更新对应端适配，内核不动
- **长会话漂移** → 持续注入三层机制本身就是对策；压缩后凭 status.md + 工件恢复现场
- **Node 运行时依赖** → 无 Node 环境自动降级为纯技能模式（Router 注入与 CLI 不可用，引导级能力全保留），安装器检测并明确提示
- **dist 产物与源码漂移** → 构建产物提交仓库（marketplace 不跑 npm install），提交前强制 `npm run build`，CI 校验 dist 为最新编译结果

## 十一、全流程异常兜底与降级（话术按能力分级修正）

### 1. 阶段执行异常

- **会话中断恢复**：CC——SessionStart hook 读取 status.md 注入断点（机制级）；Codex——Router 内置启动读取纪律（引导级）。恢复后从断点阶段续作，不重复全流程
- **技能加载异常**：Router 内置兜底——技能不可用时降级为「极简工作流」（核心开发+自查），保业务交付不阻断（引导级）

### 2. 文件与输出物异常

- **文档生成失败/权限不足**：先会话内完整留存内容，提示手动落盘，避免成果丢失
- **内容错乱/四阶缺层**：按标准模板重写覆盖；重名冲突时旧文件重命名备份再生成
- **工件路径异常**：以 status.md 记录的实际路径为准，迁移前先校验

### 3. 分级重试与流程降级

- **轻量异常（自动重试 1 次）**：格式错乱、局部缺失——重试成功继续，失败进兜底
- **中度异常（人工确认）**：阶段校验不通过、任务拆解失效——暂停并输出原因与修复建议，确认后重试
- **重度异常（流程降级，替代原「熔断」表述）**：核心流程反复失败时放弃复杂流程，转极简编码模式，优先保障业务代码交付，异常记录留档用于优化

## 十二、版本迭代与兼容策略

### 1. 语义化版本（MAJOR.MINOR.PATCH）

- **MAJOR**：工作流结构、工件规范、双端适配规则的不兼容变更
- **MINOR**：新增功能、配置项、新场景适配（向下兼容）
- **PATCH**：规则修复、话术精简、兼容性微调

### 2. 兼容策略（修正后口径）

- **平台版本**：以双平台**当前稳定版**为基准开发和验收；平台规范变更时通过适配层增量适配，不做无法验证的历史版本数量承诺
- **配置向下兼容**：新版自动兼容旧版 plugin.config.json，新增项填默认值
- **工件版本兼容**：新版可识别读取旧版 `.flow-neo/` 历史工件，支持复盘追溯
- **升级与回滚**：install.sh 幂等升级（仅更新标记段与技能文件，保留用户配置）；插件仓库 git tag 支持一键回退

### 3. 迭代约束原则

内核稳定（五阶段、四阶设计、工件标准）、适配灵活（双端适配层独立）、增量更新、最小侵入。

## 十三、验收标准（新增，全部可测量）

1. **一键安装**：双端 `plugin marketplace add` + `plugin install` 命令可用，技能被平台原生识别并列出；`npx flowneo init / remove` 项目级安装与安全卸载可用
2. **常驻达标**：CC `/context` 与 Codex 上下文统计实测，FlowNeo 常驻注入 ≤ 2K tokens
3. **A/B 对比**：同一任务集（1 轻 + 1 重）vs Superpowers，报告常驻体积、总 Token 消耗、阶段完整性三项对比
4. **断点恢复**：会话中途终止重启，CC 端 hook 自动注入断点续作；Codex 端凭 Router 纪律读取 status.md 续作
5. **工件正确性**：轻任务零工件仅代码；重任务五工件齐全落 `tasks/<slug>/`，归档后 history 快照正确、任务目录清空
6. **安全卸载**：uninstall 后 AGENTS.md 标记段移除且用户自有内容无损，hooks 注销干净

## 十四、方案总结

FlowNeo 为 Claude Code / OpenAI Codex 双平台通用工程化插件，完全对标并优化 Superpowers：

- 以**双端官方插件体系**（`.claude-plugin` / `.codex-plugin` + marketplace 一键命令）实现安装分发，Markdown 技能内核 + TypeScript 零依赖适配层，不依赖平台不存在的机制
- 以**精简持续注入**（Router ≤1.5K 常驻 + 每轮轻提醒）同时保住流程纪律与 Token 预算，解决「重注入高耗」与「轻约束漂移」的两难
- 以**五阶段精简工作流 + 四阶结构化设计 + 轻重双分流**兼顾工程规范性与交付效率
- 以**status.md 统一基座**贯通持续注入、断点续传、归档索引
- 以**可测量验收标准**替代百分比营销，效果可验证、迭代可持续

最终实现：**一套插件、双端原生、纪律不漂移、Token 可控可测、设计专业可落地、稳定可迭代。**
