# FlowNeo

[![npm version](https://img.shields.io/npm/v/flowneo.svg)](https://www.npmjs.com/package/flowneo) [![GitHub](https://img.shields.io/badge/GitHub-wlddhj/flowneo-blue?logo=github)](https://github.com/wlddhj/flowneo)

轻量跨平台 AI 编码工程工作流插件，原生兼容 **Claude Code** 与 **OpenAI Codex**。Superpowers 的精简平替：常驻 Router 持续注入保流程纪律，懒加载与轻重分流压低 Token 派耗，设计档位（全量/精简）按任务类型自适应，四阶结构化设计让方案落地更专业。

## 安装

npm 方式（推荐）：

```bash
npx flowneo init --all --project    # 或 --claude / --codex 单端安装
npx flowneo remove --all --project  # 安全卸载
```

Claude Code marketplace：

```bash
claude plugin marketplace add wlddhj/flowneo
claude plugin install flowneo@flowneo-marketplace
```

Codex marketplace：

```bash
codex plugin marketplace add wlddhj/flowneo
codex plugin install flowneo@flowneo-marketplace
# 或本地目录安装：codex plugin add <本仓库路径>
```

> 注：marketplace 安装与项目级 init 二选一，双装会双重注入。

## 快速开始

安装后任意会话中：

- **轻任务**（改 Bug / 改配置 / 补注释 / 局部微调）：直接说需求，FlowNeo 走轻量流——零文件、不留任何痕迹
- **重任务**（新功能 / 模块重构 / 数据表或接口设计）：说「新任务 <名称>」，FlowNeo 引导走五阶段

**多任务并行**：不同会话可各自推进不同任务（会话级绑定互不干扰）：

```
任务列表              # 查看所有进行中任务及阶段
继续 <名称或slug>     # 切换/恢复某任务，从断点续作
```

## 五阶段工作流（重任务）

1. 需求探索 → 2. 结构化四阶设计（**设计档位：全量/精简按任务类型自适应**——需求规格 / 功能设计 / 架构数据或技术要点 / 任务拆解）→ 3. 分任务编码 → 4. 代码自查 → 5. 交付归档

每任务独立 `.flow-neo/tasks/<slug>/` 目录（status.md + 01~05 工件），会话级绑定 `.flow-neo/sessions/<session-id>.md` 支持多任务并行，交付后迁移 `.flow-neo/history/` 形成永不覆盖的版本快照。CC 端还有 PostToolUse 工件校验：写 01~05 工件缺章节时自动提醒（仅警告不阻断）。

### 设计档位（全量 / 精简）

01 需求探索末尾按信号判定档位（涉及数据表/对外接口/跨模块依赖 → 全量；纯逻辑/算法/UI/重构/脚本 → 精简），用户可显式覆盖；02 按档执行：

- **全量档**：四阶完整（需求规格 / 功能设计 / 架构数据设计 / 任务拆解）
- **精简档**：第三阶降为「技术要点」（关键决策 / 风险与应对 / 复杂度要点），其余三阶不变

## 与 Superpowers 的差异

| 维度 | Superpowers | FlowNeo |
|---|---|---|
| 持续注入 | 重注入，常驻高 | 精简 Router ≤1.5K + 每轮轻提醒 |
| 任务分流 | 一刀切全流程 | 轻重双流，轻任务零文档 |
| 设计 | 规格与设计分离 | 四阶递进单文档 + 全量/精简档位 |
| 多任务 | 单活跃任务 | 多任务并行 + 会话级绑定 |
| 工件校验 | 无 | PostToolUse 章节校验（仅 CC 端） |
| 可配置化 | 规则臃肿难改 | 五组配置开关（含跳阶段） |
| 技术栈 | bash hooks + 多平台垫片 | TypeScript 零依赖单文件 |
| 平台 | 多平台兼容冗余 | CC + Codex 双端，无冗余 |

## 配置

`.flow-neo/config/plugin.config.json`（`flowneo init` 自动生成）五组字段：

| 字段 | 默认值 | 状态 |
|---|---|---|
| `reminders.perTurn` | `true` | 已生效——每轮轻提醒开关 |
| `archive.strategy` | `"prompt"` | 预留（v0.3.0 暂未生效） |
| `lint.routerLimit` | `1500` | 已生效——`flowneo lint` 实读 Router token 上限 |
| `schema.strictness` | `"loose"` | 已生效——PostToolUse 校验警告分级（strict 话术升级） |
| `stages.skipDesign` / `skipReview` | `false` | 已生效——Router/技能话术感知跳阶段（与设计档位正交：skipDesign 整段跳过 02；档位是 02 内部裁剪） |

## 文档

- [技术方案 v2.3](./docs/FlowNeo%20%E8%B7%A8%E5%B9%B3%E5%8F%B0AI%E7%BC%96%E7%A0%81%E6%8F%92%E4%BB%B6%E5%AE%8C%E6%95%B4%E6%8A%80%E6%9C%AF%E6%96%B9%E6%A1%88%EF%BC%88Claude%20Code%20_%20Codex%20%E9%80%9A%E7%94%A8%E3%80%81Superpowers%E7%B2%BE%E7%AE%80%E5%A2%9E%E5%BC%BA%E7%89%88%EF%BC%89.md)
- [测试方法](./docs/testing.md)
- [移植到新平台 checklist](./docs/porting-to-a-new-harness.md)
- [发布说明](./RELEASE-NOTES.md)

## 许可证

MIT，见 [LICENSE](./LICENSE)。
