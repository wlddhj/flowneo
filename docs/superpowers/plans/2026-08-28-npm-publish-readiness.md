# FlowNeo v0.4.0 npm 发包准备 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做到「可一键发布」——npm 发包配置、tarball 内容验证、文档更新全部就绪，仅剩 `npm login` + `npm publish` 两个手动动作。

**Architecture:** 纯配置/文档/验证工作，无新源码逻辑。可行性基座：`pluginRoot` 相对 `dist/cli.js` 定位（`src/cli/main.ts:9`），npm 包内目录结构与仓库一致，安装后资源解析天然成立；shebang 已由 esbuild banner 注入（`esbuild.mjs:27`）。

**Tech Stack:** npm（files 白名单 + prepublishOnly）、既有工具链（esbuild、vitest、bump-version 脚本）。

**Spec:** `docs/superpowers/specs/2026-08-28-npm-publish-readiness-design.md`

## Global Constraints

- 版本号统一 `0.4.0`，由 `npm run bump-version 0.4.0` 同步 4 处：`package.json`、`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`、`.codex-plugin/plugin.json`
- GitHub 占位地址统一 `https://github.com/huangjian/flowneo`（与 `.codex-plugin/plugin.json` 现值一致），不得改成其他地址
- `files` 白名单恰好 7 项：`dist/`、`skills/`、`hooks/`、`config/`、`.claude-plugin/`、`.codex-plugin/`、`AGENTS-flowneo.md`
- 不做（明确出范围）：`npm publish` 实际执行、GitHub 仓库创建、CI、发版自动化脚本
- `dist/` 产物入库且与源码零漂移：每次涉及 dist 的变更后必须 `npm run build` 并把 dist 变更一并提交
- 提交信息：中文、`feat:`/`docs:`/`chore:` 前缀，与仓库现有风格一致

---

### Task 1: 版本 bump 0.4.0（4 处同步）

**Files:**
- Modify（脚本自动）: `package.json`
- Modify（脚本自动）: `.claude-plugin/plugin.json`
- Modify（脚本自动）: `.claude-plugin/marketplace.json`
- Modify（脚本自动）: `.codex-plugin/plugin.json`

**Interfaces:**
- Consumes: 既有脚本 `scripts/bump-version.mjs`（npm script `bump-version`）
- Produces: 4 个文件 version 字段 = `0.4.0`，后续任务依赖此版本号（tarball 名 `flowneo-0.4.0.tgz`）

- [ ] **Step 1: 执行 bump**

Run: `npm run bump-version 0.4.0`
Expected: `已同步版本到 4 处 → 0.4.0`

- [ ] **Step 2: 校验一致性**

Run: `npm run bump-version -- --check`
Expected: `版本一致：0.4.0`

- [ ] **Step 3: 确认无意外改动**

Run: `git diff --stat`
Expected: 恰好 4 个文件各 1 行变更（version 字段）

- [ ] **Step 4: Commit**

```bash
git add package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json .codex-plugin/plugin.json
git commit -m "chore: 版本 bump 0.4.0——npm 首发 + 02 技能自我评审增强"
```

---

### Task 2: package.json 发包字段 + prepublishOnly

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: 既有 npm script `verify`（`node esbuild.mjs && git diff HEAD --exit-code dist/`）
- Produces: `files` 白名单、`repository`、`homepage`、`license`、`keywords`、`prepublishOnly` 字段；Task 3 的 pack 清单核对依赖此白名单

- [ ] **Step 1: 修改 package.json**

在 `"type": "module"` 与 `"bin"` 之间插入 `files`；在 `engines` 之后追加 `repository`/`homepage`/`license`/`keywords`；在 `scripts` 内追加 `prepublishOnly`。修改后完整文件：

```json
{
  "name": "flowneo",
  "version": "0.4.0",
  "description": "FlowNeo — 轻量跨平台 AI 编码工程工作流插件（Claude Code / Codex）",
  "type": "module",
  "bin": {
    "flowneo": "./dist/cli.js"
  },
  "files": [
    "dist/",
    "skills/",
    "hooks/",
    "config/",
    ".claude-plugin/",
    ".codex-plugin/",
    "AGENTS-flowneo.md"
  ],
  "scripts": {
    "build": "node esbuild.mjs",
    "test": "vitest run --passWithNoTests",
    "typecheck": "tsc --noEmit",
    "lint": "npm run build && node dist/cli.js lint",
    "verify": "node esbuild.mjs && git diff HEAD --exit-code dist/",
    "bump-version": "node scripts/bump-version.mjs",
    "prepublishOnly": "npm run verify"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "esbuild": "^0.24.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  },
  "engines": {
    "node": ">=18"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/huangjian/flowneo.git"
  },
  "homepage": "https://github.com/huangjian/flowneo",
  "license": "MIT",
  "keywords": [
    "claude-code",
    "codex",
    "workflow",
    "skills",
    "plugin",
    "engineering",
    "multi-task"
  ]
}
```

- [ ] **Step 2: JSON 合法性校验**

Run: `node -e "console.log(require('./package.json').version, require('./package.json').files.length)"`
Expected: `0.4.0 7`

- [ ] **Step 3: 干跑观察 files 过滤效果**

Run: `npm pack --dry-run 2>&1 | head -30`
Expected: 清单只含 `dist/`、`skills/`、`hooks/`、`config/`、`.claude-plugin/`、`.codex-plugin/`、`AGENTS-flowneo.md`、`package.json`、`README.md`、`LICENSE` 下的文件；**无** `src/`、`tests/`、`docs/`、`scripts/`、`esbuild.mjs`、`.version-bump.json`、`tsconfig.json`、`node_modules/`

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat: package.json 发包字段——files 白名单 + 仓库元信息 + prepublishOnly 防漂移卡点"
```

---

### Task 3: npm pack 正式打包与清单核对

**Files:**
- Create（临时产物，不入库）: `flowneo-0.4.0.tgz`（仓库根，验证后留在原处供 Task 4 用，Task 7 收尾删除）

**Interfaces:**
- Consumes: Task 2 的 `files` 白名单
- Produces: `flowneo-0.4.0.tgz`（Task 4 的安装输入）

- [ ] **Step 1: 打包**

Run: `npm pack`
Expected: `flowneo-0.4.0.tgz`

- [ ] **Step 2: 全量清单核对**

Run: `tar -tzf flowneo-0.4.0.tgz | sed 's|^package/||' | cut -d/ -f1 | sort -u`
Expected 输出（恰好这些顶层条目）:

```
.claude-plugin
.codex-plugin
AGENTS-flowneo.md
LICENSE
README.md
config
dist
hooks
package.json
skills
```

- [ ] **Step 3: 关键文件存在性核对**

Run: `tar -tzf flowneo-0.4.0.tgz | grep -E "dist/cli.js|hooks/hooks.json|config/plugin.config.json|claude-plugin/marketplace.json|codex-plugin/plugin.json"`
Expected: 5 行均存在，路径以 `package/` 开头

- [ ] **Step 4: 验证 prepublishOnly 接线（零副作用）**

Run: `npm publish --dry-run 2>&1 | tail -5`
Expected: 先输出 verify 的构建过程，无 `git diff` 报错，最后有 `+ flowneo-0.4.0` 与 npm notice 列表；**不得**出现 actual publish
（说明：`prepublishOnly` 在 `publish --dry-run` 时也会触发，此步即验证卡点接线成功；若 dist 有漂移此步会失败——那是预期行为）

- [ ] **Step 5: 确认 tarball 未被 git 跟踪**

Run: `git status --short`
Expected: 工作树干净（`.tgz` 不在输出中；若出现，在 `.gitignore` 追加 `*.tgz` 后重新提交 `.gitignore`）

---

### Task 4: tarball 临时目录真机实测（init / lint / remove）

**Files:**
- 无仓库文件变更（全部在 `mktemp -d` 临时目录中操作）

**Interfaces:**
- Consumes: Task 3 的 `<仓库根>/flowneo-0.4.0.tgz`；既有 CLI 子命令 `init` / `lint` / `remove`
- Produces: 验收标准 #2 的证据（三命令在 npm 安装场景真机可用）

- [ ] **Step 1: 临时目录安装 tarball**

```bash
TMP=$(mktemp -d) && cd "$TMP" && npm init -y >/dev/null && npm install "<仓库绝对路径>/flowneo-0.4.0.tgz"
```

Expected: 安装成功，`node_modules/flowneo/` 存在

- [ ] **Step 2: init 安装**

Run: `npx flowneo init --all --project`
Expected: 输出安装清单；随后核对：

```bash
ls "$TMP/.claude/skills" | head    # 期望含 _router 及 01~05 技能目录
ls "$TMP/.claude/flowneo/hooks"    # 期望编译产物 *.js
cat "$TMP/.flow-neo/config/plugin.config.json"    # 期望 JSON 可解析
grep -c "FLOWNEO" "$TMP/AGENTS.md"  # 期望 ≥1（标记段已写入）
```

- [ ] **Step 3: lint 通过**

Run: `npx flowneo lint`
Expected: `flowneo lint 通过`

- [ ] **Step 4: remove 零残留**

Run: `npx flowneo remove --all --project`
Expected: 输出卸载清单；随后核对：

```bash
ls "$TMP/.claude/skills" 2>/dev/null    # 期望：FlowNeo 技能目录已删（若目录原本只有 FlowNeo 技能则整个目录不存在）
grep -c "FLOWNEO" "$TMP/AGENTS.md" 2>/dev/null || echo "0"    # 期望 0（标记段已移除）
```

- [ ] **Step 5: 记录验证结果**

将 Step 1–4 的实际输出要点（尤其任何与期望不符处）记入任务完成报告。若任一步失败：停止后续任务，回仓库排查（最常见根因：`files` 漏项导致资源缺失）。

- [ ] **Step 6: 无提交**

本任务零仓库变更，无需 commit。

---

### Task 5: RELEASE-NOTES.md 新增 0.4.0 段

**Files:**
- Modify: `RELEASE-NOTES.md`（文件头部、`# Release Notes` 标题之后插入）

**Interfaces:**
- Consumes: Task 1 的版本号 `0.4.0`、9071a96 的 02 技能增强内容
- Produces: 无下游依赖（文档）

- [ ] **Step 1: 插入 0.4.0 段**

在 `# Release Notes` 标题行之后、`## v0.3.0` 之前插入：

```markdown
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
- GitHub 仓库创建与双端 marketplace 发布、CI、`npm publish` 实际执行
```

- [ ] **Step 2: 核对格式**

Run: `sed -n 1,20p RELEASE-NOTES.md`
Expected: 0.4.0 段在最上、紧接 v0.3.0 段，Markdown 结构与既有版本段一致

- [ ] **Step 3: Commit**

```bash
git add RELEASE-NOTES.md
git commit -m "docs: RELEASE-NOTES 0.4.0 段——npm 发包 + 02 技能自我评审增强"
```

---

### Task 6: README.md 安装节重排（npx 优先）

**Files:**
- Modify: `README.md:5-30`（`## 安装` 至注意事项行）

**Interfaces:**
- Consumes: 无
- Produces: 无下游依赖（文档）

- [ ] **Step 1: 重写安装节**

将 `## 安装` 到 `> 注：marketplace 安装与项目级 init 二选一，双装会双重注入。` 之间的整段替换为：

```markdown
## 安装

npm 方式（推荐，已可用）：

```bash
npx flowneo init --all --project    # 或 --claude / --codex 单端安装
npx flowneo remove --all --project  # 安全卸载
```

Claude Code marketplace（待 GitHub 仓库公开后可用）：

```bash
claude plugin marketplace add <owner>/flowneo
claude plugin install flowneo@flowneo-marketplace
```

Codex（待 GitHub 仓库公开后可用）：

```bash
codex plugin marketplace add <owner>/flowneo
codex plugin install flowneo@flowneo-marketplace
# 本地目录安装（已真机验证）：codex plugin add <本仓库路径>
```

> 注：marketplace 安装与项目级 init 二选一，双装会双重注入。
```

- [ ] **Step 2: 核对无残留旧命令**

Run: `grep -n "node dist/cli.js" README.md`
Expected: 无输出（旧「本仓库构建后」入口已全部被 npx 取代）

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README 安装节重排——npx flowneo 优先，marketplace 命令标注待仓库公开"
```

---

### Task 7: 终验与收尾

**Files:**
- Delete（临时产物）: `flowneo-0.4.0.tgz`（若 Task 3 Step 5 已加 .gitignore 一并核对）

**Interfaces:**
- Consumes: 前序全部任务产物
- Produces: 验收标准全绿证据

- [ ] **Step 1: 全量命令验证**

```bash
npm run build && npm run lint && npm test && npm run verify && npm run bump-version -- --check
```

Expected（按序）：构建无输出错误 → `flowneo lint 通过` → vitest 全过 → verify 无 diff 退出 0 → `版本一致：0.4.0`

- [ ] **Step 2: 清理临时 tarball**

Run: `rm -f flowneo-0.4.0.tgz && git status --short`
Expected: 工作树干净

- [ ] **Step 3: 验收清单核对**

对照 spec 第五节验收标准逐条确认：

| # | 标准 | 证据来源 |
|---|------|---------|
| 1 | tarball 内容最小且完整 | Task 3 Step 2/3 |
| 2 | tarball 安装后三命令真机可用 | Task 4 Step 2/3/4 |
| 3 | 版本 0.4.0 四处一致 | Task 7 Step 1 的 --check |
| 4 | RELEASE-NOTES 与 README 更新 | Task 5/6 |
| 5 | 仅剩 npm login + publish | Task 3 Step 4 prepublishOnly 已验证 |

- [ ] **Step 4: 最终提交（如有零星收尾变更）**

Run: `git status --short`
Expected: 干净；若 Step 2 产生 `.gitignore` 变更则：

```bash
git add .gitignore && git commit -m "chore: gitignore 补 *.tgz"
```

---

## Self-Review 记录

- **Spec 覆盖**：spec 三节变更（package.json / 版本 / RELEASE-NOTES / README）→ Task 1/2/5/6；验证方案 4 条 → Task 3/4/7；验收标准 5 条 → Task 7 Step 3 映射；「不变项」在 Global Constraints 声明。无缺口。
- **占位符扫描**：所有命令含期望输出；README/RELEASE-NOTES 给全文；无 TBD/TODO/「类似 Task N」。
- **一致性**：tarball 名 `flowneo-0.4.0.tgz` 在 Task 3/4/7 一致；`files` 7 项在 Task 2/3 一致；GitHub 占位地址三处统一 `https://github.com/huangjian/flowneo`。
