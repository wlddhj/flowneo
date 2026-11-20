# FlowNeo

[![npm version](https://img.shields.io/npm/v/flowneo.svg)](https://www.npmjs.com/package/flowneo) [![GitHub](https://img.shields.io/badge/GitHub-wlddhj/flowneo-blue?logo=github)](https://github.com/wlddhj/flowneo)

轻量跨平台 AI 编码工程工作流插件，原生兼容 **Claude Code**、**OpenAI Codex** 与 **ZCode**。Superpowers 的精简平替。**定位是交付的可审计性**：常驻 Router 注入流程纪律，重任务走五阶段（需求 → 设计确认门禁 → 编码 → 审查 → 归档），每步落痕为 `.flow-neo/` 工件全程可追溯；轻任务零文档零开销。基准实测如实呈现：流程遵循度满配（重任务工件 30/30），交付质量与裸跑持平——FlowNeo 提供的是治理与可追溯，不是代码质量的魔法（数据见[基准报告](#基准数据可复现)）。

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

ZCode（走 Claude Code 兼容层，v0.5.0+ 实测可用）：

```text
设置 → 插件 → 创建 → 添加插件市场 → wlddhj/flowneo → 个人分段安装 FlowNeo
# 安装后新建 session 生效（Hook 配置按 session 快照）
```

> 注：marketplace 安装与项目级 init 二选一，双装会双重注入。

## 快速开始

安装后任意会话中：

- **轻任务**（改 Bug / 改配置 / 补注释 / 单点修复，不新增文件）：直接说需求，FlowNeo 走轻量流——零文件、不留任何痕迹
- **重任务**（新功能 / 命令 / 接口 / 模块重构 / 明言多文件）：说「新任务 <名称>」，FlowNeo 引导走五阶段；**按需求信号判定，不预判文件数，拿不准判重**
- 编码中对实现层的已知限度取舍，写 `flowneo-shortcut: <限制>, <何时升级>` 注释（阶段四审查收割核对）

**多任务并行**：不同会话可各自推进不同任务（会话级绑定互不干扰）：

```
任务列表              # 查看所有进行中任务及阶段
继续 <名称或slug>     # 切换/恢复某任务，从断点续作
```

## 五阶段工作流（重任务）

1. 需求探索 → 2. 结构化四阶设计（**设计档位：全量/精简按任务类型自适应**——需求规格 / 功能设计 / 架构数据或技术要点 / 任务拆解）→ **用户确认门禁**（02 落盘后停等，统一输出待确认问题清单，用户全部确认并落痕「确认记录」后才进编码；skipDesign 快速通道豁免）→ 3. 分任务编码 → 4. 代码自查 → 5. 交付归档

每任务独立 `.flow-neo/tasks/<slug>/` 目录（status.md + 01～05 工件），会话级绑定 `.flow-neo/sessions/<session-id>.md` 支持多任务并行，交付后迁移 `.flow-neo/history/` 形成永不覆盖的版本快照。CC 端还有 PostToolUse 工件校验：写 01～05 工件缺章节时自动提醒（仅警告不阻断）。

### 设计档位（全量 / 精简）

01 需求探索末尾按信号判定档位（涉及数据表/对外接口/跨模块依赖 → 全量；纯逻辑/算法/UI/重构/脚本 → 精简），用户可显式覆盖；02 按档执行：

- **全量档**：四阶完整（需求规格 / 功能设计 / 架构数据设计 / 任务拆解）
- **精简档**：第三阶降为「技术要点」（关键决策 / 风险与应对 / 复杂度要点），其余三阶不变

## 基准数据（可复现）

基于真实 headless 会话的三臂对照基准（13 任务卡 × 隐藏检查点 × good/bad 参照评分），方法论与逐格数据全部公开：

| 结论 | 数据 |
|---|---|
| 流程遵循度（A/B 验证） | 信号导向分流后，重任务五阶段工件 **30/30 满配**（改造前均值 3.60/6、0 值格 12） |
| 交付质量 | 三臂持平（baseline / flowneo / 一句话排伪，修订口径 93.5% 逐字相同）——**不宣称质量提升** |
| 档位无关 | GLM-5.3 与 5.3-Flash 裸跑仅差 1pp；「弱模型护栏」假设经检验证伪 |
| 代价 | 重任务成本 +43%（$1.26→$1.80/格）——用确定性成本换全程可追溯 |

报告：[首轮 117 格](./benchmarks/results/2026-11-20-bench.md) · [分流 A/B](./benchmarks/results/2026-11-20-router-ab.md) · [护栏证伪](./benchmarks/results/2026-11-20-flash-guardrail.md)；复现：`npm run bench -- --selftest|--run`（见 [benchmarks/README](./benchmarks/README.md)）。

## 与 Superpowers 的差异

| 维度 | Superpowers | FlowNeo |
|---|---|---|
| 持续注入 | 重注入，常驻高 | 精简 Router ≤1.5K + 每轮轻提醒 |
| 任务分流 | 一刀切全流程 | 轻重双流，轻任务零文档 |
| 设计 | 规格与设计分离 | 四阶递进单文档 + 全量/精简档位 |
| 设计确认 | 设计定即开工 | 02 落盘停等确认，清单全亮 + 确认记录落痕守门 |
| 多任务 | 单活跃任务 | 多任务并行 + 会话级绑定 |
| 工件校验 | 无 | PostToolUse 章节校验（仅 CC 端） |
| 可配置化 | 规则臃肿难改 | 五组配置开关（含跳阶段） |
| 技术栈 | bash hooks + 多平台垫片 | TypeScript 零依赖单文件 |
| 平台 | 多平台兼容冗余 | CC + Codex + ZCode 三端（ZCode 复用 CC 兼容层，零结构冗余） |
| 基准验证 | 无公开数据 | 三份可复现基准报告（117 格首测 / 分流 A/B / 护栏证伪） |

## 配置

`.flow-neo/config/plugin.config.json`（`flowneo init` 自动生成）五组字段：

| 字段 | 默认值 | 状态 |
|---|---|---|
| `reminders.perTurn` | `true` | 已生效——每轮轻提醒开关 |
| `archive.strategy` | `"prompt"` | 已生效——05 归档技能按策略切换（auto 直接迁移 / manual 仅留工件 / prompt 询问确认） |
| `lint.routerLimit` | `1500` | 已生效——`flowneo lint` 实读 Router token 上限 |
| `schema.strictness` | `"loose"` | 已生效——PostToolUse 校验警告分级（strict 话术升级） |
| `stages.skipDesign` / `skipReview` | `false` | 已生效——Router/技能话术感知跳阶段（与设计档位正交：skipDesign 整段跳过 02；档位是 02 内部裁剪） |

## 文档

- [技术方案 v2.4](./docs/FlowNeo%20%E8%B7%A8%E5%B9%B3%E5%8F%B0AI%E7%BC%96%E7%A0%81%E6%8F%92%E4%BB%B6%E5%AE%8C%E6%95%B4%E6%8A%80%E6%9C%AF%E6%96%B9%E6%A1%88%EF%BC%88Claude%20Code%20_%20Codex%20%E9%80%9A%E7%94%A8%E3%80%81Superpowers%E7%B2%BE%E7%AE%80%E5%A2%9E%E5%BC%BA%E7%89%88%EF%BC%89.md)
- [测试方法](./docs/testing.md)
- [移植到新平台 checklist](./docs/porting-to-a-new-harness.md)
- [发布说明](./RELEASE-NOTES.md)

## 工程自检（贡献者）

```bash
npx flowneo lint                        # 插件结构 / Router token ≤1500 / 双端同步 / manifest 版本与 URI 一致性
npm run bench -- --selftest             # 基准评分器参照自检（good 必过 / bad 必抓，无 API 消耗）
npm run bench -- --run --stamp <日期>   # 完整基准矩阵（见 benchmarks/README.md）
```

## 许可证

MIT，见 [LICENSE](./LICENSE)。
