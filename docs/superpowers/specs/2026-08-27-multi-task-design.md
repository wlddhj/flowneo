# FlowNeo 多任务并行支持设计（v0.2.0）

日期：2026-08-27
状态：已与用户逐节确认
前置：v2.1 技术方案（单任务模型）+ 阶段一 MVP 已实现（分支 feat/stage1-cc-mvp）

## 1. 背景与目标

当前模型：`.flow-neo/current/` 为唯一活跃区，一个项目同一时间只能有一个进行中任务。实际项目中常需并行推进多个任务（会话内穿插 + 多会话各自并行）。

目标：支持多任务并行——任务独立寻址、互不干扰、独立归档；CC 端做到机制级会话绑定，Codex 端维持引导级。

## 2. 已确认的决策

| 决策点 | 结论 |
|---|---|
| 并行场景 | 两者都要：会话内穿插切换 + 多会话各自并行 |
| 任务标识 | 自动 slug（任务名转短横线，冲突 -2/-3 递增；用户可显式指定） |
| 轻任务 | 完全不入任务系统：不建目录、不写文件，会话内直接做直接交付 |
| 指针方案 | 方案 A：会话级绑定文件 `.flow-neo/sessions/<session-id>.md` |
| 兼容策略 | 无存量数据（v0.1.0 未发布），直接切换目录结构，版本升 0.2.0 |

## 3. 目录结构与状态模型

```
.flow-neo/
├── tasks/                        # 进行中的重任务（每任务独立目录）
│   └── <slug>/
│       ├── status.md             # task / slug / stage / artifacts / updated
│       └── 01~05 工件（懒生成，文件名不变）
├── sessions/                     # 会话→任务绑定（CC 机制级）
│   └── <session-id>.md           # 内容一行：task: <slug>
└── history/                      # 归档区：history/<YYYYMMDD>-<slug>/
```

- `status.md` 字段：`task`（人读任务名）、`slug`（目录标识/寻址键）、`stage`（1~5）、`artifacts`（已产出工件）、`updated`。**去掉 `mode` 字段**（轻任务不入库后无意义）
- 原 `current/` 与 `config/` 目录取消
- 轻任务零痕迹：不建目录、不写文件

## 4. 任务生命周期

| 动作 | 触发 | 行为 |
|---|---|---|
| 创建 | Router 判定为重任务 → 调用 01 技能 | 01 技能步骤 1：生成 slug（用户显式指定时用指定名；冲突 -2 递增）→ 建 `tasks/<slug>/status.md`（stage:1）→ 写本会话绑定（Codex 端无 session_id，跳过此步）。任务创建内聚在 01，Router 无独立创建动作 |
| 绑定/切换 | 用户说「继续/切换到 <名称或slug>」或新会话动工 | 模糊匹配 `tasks/` 下任务 → 写 `sessions/<session-id>.md` |
| 列表 | 用户说「任务列表」/ 无绑定会话注入 | 逐行输出 task + stage（≤5 行） |
| 归档 | 05 阶段完成 | `tasks/<slug>/` → `history/<YYYYMMDD>-<slug>/`（去重规则不变）→ 删除所有引用该任务的绑定文件 |

分流规则简化：**轻 → 直接做（零痕迹）；重 → 必须先有任务目录 + 会话绑定才能动工**（无绑定动重活 = Red Flag）。

## 5. hook 注入链路

**SessionStart（CC）**：
1. 清理 7 天前的 `sessions/*.md`
2. 读 stdin `session_id` → 查绑定：有 → 注入 Router + 绑定任务 status；无 → 注入 Router + 任务列表（逐任务一行）

**UserPromptSubmit（CC，每轮）**：
1. 读 stdin `session_id` → 绑定 → 任务 status
2. 注入「本任务阶段纪律提醒」+ 其他进行中任务列表（上限 5 行，超出显示「…及 N 个」）
3. 无绑定时注入三分支提醒：新建 / 继续既有 / 轻任务直接做
4. stdin 解析容错：读不到 session_id 时降级为无绑定提醒，不报错（维持 exit 0 + 合法 JSON 的既有兜底）

**src/lib 改动**：
- 新增 `readBinding(sessionId)` / `writeBinding(sessionId, slug)` / `listTasks()`（读 `tasks/*/status.md` 摘要）/ slug 生成函数 / stdin JSON 解析（取 `session_id`，失败返回 null）
- `readStatus` / `buildSessionContext` / `buildTurnReminder` 签名增加 sessionId（或 taskId）维度
- 会话清理逻辑（按文件 mtime 7 天）

**Codex 端（引导级）**：无 session_id，Router 指令为「动重活前先看 `tasks/` 判断继续哪个或询问用户新建」；单会话内体验与 CC 一致，跨会话并行是软约束（不新增承诺，与 v2.1 能力分级声明一致）。

## 6. 技能改动

| 技能 | 改动 |
|---|---|
| 01 需求探索 | 步骤 1 扩展为任务创建（slug + 目录 + status + 会话绑定）；工件路径 `current/` → `tasks/<slug>/` |
| 02 四阶设计 | 路径替换；HARD-GATE 引用路径同步 |
| 03 编码执行 | 路径替换（task-record 写入本任务目录） |
| 04 代码审查 | 路径替换 |
| 05 交付归档 | 归档源改 `tasks/<slug>/`；新增「删除引用该任务的会话绑定文件」 |

status.md 模板：`task / slug / stage / artifacts / updated` 五字段。

## 7. 边界与约束

1. **并行文件冲突**：机制上不强制。Router Red Flags 新增：「他任务 02 拆解表与本任务涉及文件重叠时，动工前先向用户确认」
2. **注入体积**：任务列表 ≤5 行；Router 总体积仍守 ≤1500 tokens（lint 卡点不变）
3. **会话文件清理**：SessionStart 删 7 天前绑定文件
4. **slug 冲突**：-2、-3 递增（与归档去重同规则）
5. **版本同步**：0.1.0 → 0.2.0，`package.json` / `.claude-plugin/plugin.json` / `.claude-plugin/marketplace.json` 三处
6. **文档同步**：技术方案文档升 v2.2——「三、持续注入机制」「五、整体架构」「六、工件规范」中 `current/` 相关表述全部更新，修订记录追加

## 8. 测试与验收

**单测（vitest）**：
- slug 生成：中文转短横线、冲突递增、显式指定
- readBinding / writeBinding 读写与容错
- listTasks 多任务摘要（含 >5 截断）
- readStatus 按 taskId
- buildSessionContext / buildTurnReminder：有绑定 / 无绑定 / 多任务列表三分支
- 会话清理（mtime 7 天）
- stdin JSON 解析容错

**真机验收**：
1. 会话 A 新任务做到阶段 2 → 会话 B 另开新任务：两会话每轮提醒互不干扰（各自绑定的任务）
2. 会话内「切换到任务X」再切回原任务：断点续作正确
3. 轻任务全程零文件产生
4. 任务归档：history 快照完整 + 引用绑定文件被清理 + 其他任务不受影响
5. `npm run lint` 与 `npm run verify` 全绿；Router 体积 ≤1500

## 9. 不做的事（YAGNI）

- 不做任务优先级/依赖管理（列表按目录名排序即可）
- 不做跨任务文件锁或自动冲突检测（话术警示足够）
- 不做 Codex 端会话绑定机制（平台无 hook，不虚构）
- 不做 config 目录/配置系统（延续推迟）
