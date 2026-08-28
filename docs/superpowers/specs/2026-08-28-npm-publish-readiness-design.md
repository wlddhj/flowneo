# FlowNeo v0.4.0 npm 发包与发布准备 — 设计文档

日期：2026-08-28
状态：已与用户逐节确认

## 一、背景与目标

FlowNeo v0.3.0 已完成双端适配（Claude Code / Codex）、CLI init/remove、配置系统与 Schema 校验。对照技术方案「阶段三：完善版」，npm 发包（`npx flowneo` 正式入口）是最大未完成项。

**本次目标**：做到「可一键发布」——发包配置、包内容验证、文档更新全部就绪，仅剩 `npm login` + `npm publish` 两个手动动作。

**已确认的关键决策**：

| 决策点 | 结论 |
|--------|------|
| npm 包名 | `flowneo`（registry 未占用，实测 E404） |
| 版本号 | `0.4.0`（9071a96 的 02 技能自我评审增强按 semver minor 发） |
| GitHub 仓库 | 暂不建；README/marketplace 相关保持占位，建仓后独立任务 |
| 执行边界 | 准备到可发布，不实际执行 `npm publish` |
| CI / 发版自动化 | 不做，建仓后独立任务 |

## 二、可行性依据

- `pluginRoot` 相对 `dist/cli.js` 定位（`src/cli/main.ts:9`：`fileURLToPath(new URL('../', import.meta.url))`），npm 包内目录结构与仓库一致，安装后资源路径解析天然成立。
- `dist/cli.js` 已有 shebang（`esbuild.mjs:27` banner 注入），bin 可直接执行。
- `npm view flowneo` 返回 404，包名可用。

## 三、变更内容

### 1. package.json

```jsonc
{
  "version": "0.4.0",
  "files": [
    "dist/",
    "skills/",
    "hooks/",
    "config/",
    ".claude-plugin/",
    ".codex-plugin/",
    "AGENTS-flowneo.md"
  ],
  "repository": { "type": "git", "url": "git+https://github.com/huangjian/flowneo.git" },
  "homepage": "https://github.com/huangjian/flowneo",
  "license": "MIT",
  "keywords": ["claude-code", "codex", "workflow", "skills", "plugin", "engineering", "multi-task"],
  "scripts": {
    "prepublishOnly": "npm run verify"
  }
}
```

要点：

- `files` 白名单排除 `src/`、`tests/`、`docs/`（含大文件技术方案）、`scripts/`、`esbuild.mjs`、`.version-bump.json`——npm 包只留运行所需；README、LICENSE、package.json 由 npm 自动包含。
- `repository`/`homepage` 为 GitHub 占位地址，与 `.codex-plugin/plugin.json` 现有值一致；建仓后若实际地址不同，随建仓任务一并修正。
- `prepublishOnly` 复用现有 `verify`（重建 dist + `git diff --exit-code dist/`），落实方案文档「dist 产物与源码漂移」风险对策。

### 2. 版本同步

- `npm run bump-version 0.4.0` 同步 4 处：`package.json`、`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`、`.codex-plugin/plugin.json`。
- `npm run bump-version -- --check` 验证一致。

### 3. RELEASE-NOTES.md 新增 0.4.0 段（2026-08-28）

- **设计质量增强**：02 设计技能补自我评审（四阶交叉自检清单）与用户确认门（不确定项一次性确认）。
- **npm 正式发包**：`npx flowneo init/lint/remove` 入口、`files` 白名单、`prepublishOnly` 防漂移卡点。
- 注明 GitHub 仓库与双端 marketplace 发布为后续项。

### 4. README.md 安装节重排

```
## 安装
npm 方式（推荐，已可用）：
  npx flowneo init --all --project
  npx flowneo remove --all --project   # 安全卸载

Claude Code marketplace（待 GitHub 仓库公开后可用）：
  claude plugin marketplace add <owner>/flowneo ...
Codex marketplace（同上待公开）：
  ...
```

- 删除现有「项目级安装（本仓库构建后）`node dist/cli.js init`」整段——被 npx 方式取代。
- marketplace 命令块保留（最终形态指引），各加「待仓库公开后可用」说明，`<owner>` 占位不删。
- 「marketplace 安装与项目级 init 二选一，双装会双重注入」注意事项保留。

### 5. 不变项

- `docs/` 技术方案文档（描述计划非状态，不改）。
- `.codex-plugin/plugin.json` 已有的 homepage/repository 占位（与 package.json 取值一致）。
- CI、发版自动化脚本、GitHub 仓库——建仓后独立任务。

## 四、验证方案

全部本地、零副作用：

1. **构建与自检**：`npm run build` + `npm run lint`（router ≤1500 tokens + frontmatter + AGENTS 同步）+ `npm test`（vitest）。
2. **npm pack 干跑**：核对 tarball 清单——
   - 必含：`dist/`（cli + hooks 产物）、`skills/`、`hooks/hooks.json`、`config/`、`.claude-plugin/`、`.codex-plugin/`、`AGENTS-flowneo.md`、README、LICENSE。
   - 必不含：`src/`、`tests/`、`docs/`、`scripts/`、`esbuild.mjs`、`.version-bump.json`。
3. **tarball 真机实测**：临时目录 `npm install <tarball>` → `npx flowneo init --all --project`（检查 `.claude/skills`、`.claude/flowneo/hooks`、`.flow-neo/config`、AGENTS.md 标记段）→ `npx flowneo lint` 通过 → `npx flowneo remove --all --project` 零残留。
4. **版本一致性**：`npm run bump-version -- --check` 输出 0.4.0。

## 五、验收标准

| # | 标准 | 验证方式 |
|---|------|---------|
| 1 | tarball 内容最小且完整 | pack 清单逐项核对 |
| 2 | tarball 安装后 init/lint/remove 三命令真机可用 | 临时目录实测 |
| 3 | 版本 0.4.0 四处一致 | bump-version --check |
| 4 | RELEASE-NOTES 0.4.0 段、README 安装节更新 | 人工审阅 |
| 5 | 仅剩 `npm login` + `npm publish` 两个手动动作 | prepublishOnly 已接线 |

## 六、后续任务（不属于本次范围）

1. GitHub 仓库创建 + remote 关联 + 推送；真实地址回填 README/package.json/.codex-plugin 三处占位。
2. 双端 marketplace 发布验证（README 命令去掉「待公开」说明）。
3. GitHub Actions CI（dist 最新编译校验 + lint + test）。
4. `npm publish` 实际执行与 `npx flowneo` 线上验证。
