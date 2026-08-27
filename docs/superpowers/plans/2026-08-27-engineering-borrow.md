# FlowNeo 工程化补充实施计划（借鉴 superpowers）

> **For agentic workers:** 用 superpowers:executing-plans 或 inline 执行。Steps use checkbox (`- [ ]`).

**Goal:** 借鉴 superpowers 工程化做法，补齐 FlowNeo 的开源基础与工程化防线（README/LICENSE/.gitattributes/版本同步/发布说明/测试文档/CI/移植指南）。

**Architecture:** 8 个独立文件/配置创建，无核心代码改动；bump-version.mjs 用 Node 脚本（与既有 TS 工程同语言生态）；CI 复用既有 verify 脚本作为 dist 漂移防线。

**Tech Stack:** Node ≥18 / GitHub Actions / Markdown / JSON

**Spec:** 调研结论 + 用户确认「全做」（A-H 8 项）

## Global Constraints

- 不改动既有 `src/` `skills/` `tests/` `dist/` 的功能逻辑
- 新文件以中文为主（README/RELEASE-NOTES/testing/porting），LICENSE 用标准 MIT 英文
- 版本号当前 0.2.0，三处一致（package.json / .claude-plugin/plugin.json / .claude-plugin/marketplace.json）
- 提交信息 conventional commits
- 新工作分支 `feat/engineering-borrow`（基于 main）

---

### Task 1: README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: 写入 README.md**

````markdown
# FlowNeo

轻量跨平台 AI 编码工程工作流插件，原生兼容 **Claude Code** 与 **OpenAI Codex**。Superpowers 的精简平替：常驻 Router 持续注入保流程纪律，懒加载与轻重分流压低 Token 消耗，四阶结构化设计让方案落地更专业。

## 安装

Claude Code（marketplace 一键）：

```bash
claude plugin marketplace add <owner>/flowneo
claude plugin install flowneo@flowneo-marketplace
```

Codex：

```bash
codex plugin marketplace add <owner>/flowneo
codex plugin install flowneo@flowneo-marketplace
```

项目级兜底（未来版本）：`npx flowneo init`

## 快速开始

安装后任意会话中：

- **轻任务**（改 Bug / 改配置 / 补注释 / 局部微调）：直接说需求，FlowNeo 走轻量流——零工件文件，仅 status.md 一行记录
- **重任务**（新功能 / 模块重构 / 数据表或接口设计）：说「新任务 <名称>」，FlowNeo 引导走五阶段

## 五阶段工作流（重任务）

1. 需求探索 → 2. 结构化四阶设计（需求规格 / 功能设计 / 架构数据 / 任务拆解）→ 3. 分任务编码 → 4. 代码自查 → 5. 交付归档

每任务独立 `.flow-neo/tasks/<slug>/` 目录，会话级绑定 `.flow-neo/sessions/<session-id>.md` 支持多任务并行。

## 与 Superpowers 的差异

| 维度 | Superpowers | FlowNeo |
|---|---|---|
| 持续注入 | 重注入，常驻高 | 精简 Router ≤1.5K + 每轮轻提醒 |
| 任务分流 | 一刀切全流程 | 轻重双流，轻任务零文档 |
| 设计 | 规格与设计分离 | 四阶递进单文档 |
| 多任务 | 单活跃任务 | 多任务并行 + 会话级绑定 |
| 平台 | 多平台兼容冗余 | CC + Codex 双端，无冗余 |

## 配置

`.flow-neo/config/plugin.config.json`（阶段三实现）：流程开关、提醒级别、归档策略。

## 文档

- [技术方案 v2.2](./docs/FlowNeo%20%E8%B7%A8%E5%B9%B3%E5%8F%B0AI%E7%BC%96%E7%A0%81%E6%8F%92%E4%BB%B6%E5%AE%8C%E6%95%B4%E6%8A%80%E6%9C%AF%E6%96%B9%E6%A1%88%EF%BC%88Claude%20Code%20_%20Codex%20%E9%80%9A%E7%94%A8%E3%80%81Superpowers%E7%B2%BE%E7%AE%80%E5%A2%9E%E5%BC%BA%E7%89%88%EF%BC%89.md)
- [测试方法](./docs/testing.md)
- [移植到新平台 checklist](./docs/porting-to-a-new-harness.md)
- [发布说明](./RELEASE-NOTES.md)

## 许可证

MIT，见 [LICENSE](./LICENSE)。
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README——定位/安装/快速开始/与 Superpowers 差异"
```

---

### Task 2: LICENSE

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: 写入 MIT 许可证**（年份 2026，作者 huangjian）

```text
MIT License

Copyright (c) 2026 huangjian

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Commit**

```bash
git add LICENSE
git commit -m "docs: 添加 MIT LICENSE"
```

---

### Task 3: .gitattributes

**Files:**
- Create: `.gitattributes`

- [ ] **Step 1: 写入强制 LF 与二进制规则**

```text
* text=auto eol=lf
*.ts text eol=lf
*.js text eol=lf
*.mjs text eol=lf
*.json text eol=lf
*.md text eol=lf
*.sh text eol=lf
*.yml text eol=lf
*.yaml text eol=lf
*.png binary
*.svg binary
*.jpg binary
```

- [ ] **Step 2: 验证当前文件无 CRLF**

Run: `git add .gitattributes && git add --renormalize . && git status`
Expected: 无 `modified` 行（说明仓库现有文件均已是 LF）；若有 modified 提交之

- [ ] **Step 3: Commit**

```bash
git add .gitattributes
git commit -m "chore: .gitattributes 强制 LF（跨平台一致性）"
```

---

### Task 4: 版本同步——.version-bump.json + scripts/bump-version.mjs

**Files:**
- Create: `.version-bump.json`
- Create: `scripts/bump-version.mjs`
- Modify: `package.json`（新增 `bump-version` script）

- [ ] **Step 1: 写入 `.version-bump.json`**

```json
{
  "files": [
    "package.json",
    ".claude-plugin/plugin.json",
    ".claude-plugin/marketplace.json"
  ],
  "audit": {
    "exclude": [
      "RELEASE-NOTES.md",
      "node_modules",
      ".git",
      "scripts/bump-version.mjs"
    ]
  }
}
```

- [ ] **Step 2: 写入 `scripts/bump-version.mjs`**

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const config = JSON.parse(readFileSync(resolve(root, '.version-bump.json'), 'utf8'))

function readVersion(file) {
  const content = JSON.parse(readFileSync(resolve(root, file), 'utf8'))
  return file === '.claude-plugin/marketplace.json' ? content.plugins[0].version : content.version
}

function writeVersion(file, version) {
  const path = resolve(root, file)
  const content = JSON.parse(readFileSync(path, 'utf8'))
  if (file === '.claude-plugin/marketplace.json') {
    content.plugins[0].version = version
  } else {
    content.version = version
  }
  writeFileSync(path, JSON.stringify(content, null, 2) + '\n')
}

const target = process.argv[2]

if (!target) {
  console.error('用法：node scripts/bump-version.mjs <新版本号> | --check')
  process.exit(1)
}

if (target === '--check') {
  const versions = config.files.map((f) => ({ file: f, version: readVersion(f) }))
  const unique = new Set(versions.map((v) => v.version))
  if (unique.size > 1) {
    console.error('版本漂移：')
    for (const v of versions) console.error(`  ${v.file}: ${v.version}`)
    process.exit(1)
  }
  console.log('版本一致：' + versions[0].version)
  process.exit(0)
}

if (!/^\d+\.\d+\.\d+$/.test(target)) {
  console.error(`非法版本号：${target}（应为 x.y.z）`)
  process.exit(1)
}

for (const f of config.files) writeVersion(f, target)
console.log(`已同步版本到 ${config.files.length} 处 → ${target}`)
```

- [ ] **Step 3: 在 `package.json` scripts 区追加 `bump-version`**

在 `"verify": "..."` 行后追加：
```json
    "bump-version": "node scripts/bump-version.mjs",
```

- [ ] **Step 4: 验证 --check（当前应一致 0.2.0）**

Run: `node scripts/bump-version.mjs --check`
Expected: `版本一致：0.2.0`

- [ ] **Step 5: 验证 bump 真同步（dry run 风格—— bump 到 0.2.1 再回滚 0.2.0）**

Run:
```bash
node scripts/bump-version.mjs 0.2.1 && grep '"version"' package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json
node scripts/bump-version.mjs 0.2.0
```
Expected: 第一次三处均显示 0.2.1；回滚后三处均 0.2.0

- [ ] **Step 6: Commit**

```bash
git add .version-bump.json scripts/bump-version.mjs package.json
git commit -m "feat: 版本同步工具——.version-bump.json + bump-version.mjs（--check 漂移检测）"
```

---

### Task 5: RELEASE-NOTES.md

**Files:**
- Create: `RELEASE-NOTES.md`

- [ ] **Step 1: 写入发布说明（按子系统分组 + 结果句）**

````markdown
# Release Notes

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
````

- [ ] **Step 2: Commit**

```bash
git add RELEASE-NOTES.md
git commit -m "docs: RELEASE-NOTES——v0.1.0/v0.2.0 按子系统分组发布说明"
```

---

### Task 6: docs/testing.md

**Files:**
- Create: `docs/testing.md`

- [ ] **Step 1: 写入双轨测试说明**

````markdown
# FlowNeo 测试方法

FlowNeo 区分代码集成测试（进 CI）与 LLM 行为验证（不进 CI）两类，与 superpowers 的 `tests/` vs `evals/` 双轨模型一致。

## tests/（代码集成测试，进 CI）

Vitest 单测，覆盖纯函数逻辑：

| 文件 | 覆盖 |
|---|---|
| `tests/tokens.test.ts` | token 估算（CJK / ASCII 混合） |
| `tests/tasks.test.ts` | slug 生成 / 绑定读写 / 任务列表 / 过期清理 / stdin 解析 |
| `tests/router.test.ts` | Router 组装、绑定感知注入、多任务列表截断、safe 兜底 |
| `tests/inject.test.ts` | hook JSON 输出格式 |
| `tests/lint.test.ts` | lint 校验逻辑 |

运行：`npm test`

## 真机 eval（LLM 行为验证，不进 CI）

通过 `claude -p` 非交互会话验证技能链触发与分流判定：

- **注入验证**：`claude -p '复述你收到的 FLOWNEO_ROUTER 第一行'`
- **技能触发与 premature-action 检测**：`claude -p '<重任务需求>' --max-turns N --output-format stream-json`，grep Skill 调用事件，断言首个工具调用是 Skill
- **多会话并行**：两会话各自绑定不同任务，互不干扰

详见各实施计划的「真机验收」清单。

## 为何 eval 不进 CI

LLM 输出非确定性，CI 跑 eval 会引入 flaky。eval 作为发版前人工或本地脚本验证。
````

- [ ] **Step 2: Commit**

```bash
git add docs/testing.md
git commit -m "docs: testing——tests 与真机 eval 双轨说明"
```

---

### Task 7: .github/workflows/ci.yml

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 写入 CI workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run lint
      - run: npm run verify
```

- [ ] **Step 2: 本地模拟 CI 验证（全绿才算过）**

Run: `npm ci && npm run typecheck && npm test && npm run lint && npm run verify`
Expected: 全部通过，`npm run verify` 输出 dist 零漂移

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: GitHub Actions——typecheck/test/lint/verify 全量防线"
```

---

### Task 8: docs/porting-to-a-new-harness.md

**Files:**
- Create: `docs/porting-to-a-new-harness.md`

- [ ] **Step 1: 写入移植 checklist（占位 + 关键不变量）**

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
git add docs/porting-to-a-new-harness.md
git commit -m "docs: porting-to-a-new-harness 移植 checklist（占位）"
```

---

## Self-Review 记录

- **Spec 覆盖**：A README、B LICENSE、C .gitattributes、D 版本同步、E RELEASE-NOTES、F testing.md、G CI、H porting.md 八项全覆盖。
- **占位符**：无 TBD，所有文件内容完整。
- **一致性**：版本号统一 0.2.0；README 引用的文件路径与实际创建一致（LICENSE / docs/testing.md / docs/porting-to-a-new-harness.md / RELEASE-NOTES.md）。
