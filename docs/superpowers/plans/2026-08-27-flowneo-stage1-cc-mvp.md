# FlowNeo 阶段一（Claude Code 单端 MVP）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可本地安装、真机可用的 FlowNeo Claude Code 插件 MVP：Router 持续注入 + 5 阶段技能 + `.flow-neo` 工件体系。

**Architecture:** Markdown 技能内核（`skills/`）+ TypeScript 适配层（`src/`，esbuild 零依赖单文件产物至 `dist/`，提交仓库）。两个 CC hooks（SessionStart 注入 Router+status；UserPromptSubmit 每轮阶段提醒）经插件 `hooks/hooks.json` 自动注册，本地目录 marketplace 安装验证。

**Tech Stack:** TypeScript 5 / Node ≥18 / esbuild / vitest / Claude Code Plugin 规范（`.claude-plugin` + `hooks/hooks.json`）

> 修订（2026-08-27）：吸收 superpowers v6.3 源码调研结论——Router 增加子代理豁免标签与 Red Flags 合理化对照表；02/03 技能增加 `<HARD-GATE>` 封条；SessionStart matcher 补 `clear`；端到端验收增加真模型技能触发检测（stream-json + premature-action 检查，superpowers 同款测试法）。

## Global Constraints

- 技能内核纯 Markdown；适配层 TypeScript，运行时零外部依赖（仅 Node 标准库），产物经 esbuild 打包为自包含单文件并提交仓库（`dist/`）
- Router（`skills/_router/router.md`）token 估算 ≤ 1500：CJK 字符计 1 token/字，其余 4 字符计 1 token
- 工件仅写入 `.flow-neo/`，文件名固定：`status.md`、`01-need-explore.md`、`02-design-plan.md`、`03-task-record.md`、`04-code-review.md`、`05-archive-summary.md`
- 技能 frontmatter `name` 统一前缀 `flowneo-`，小写字母/数字/连字符
- CC hook 输出格式：`{"hookSpecificOutput":{"hookEventName":"<Event>","additionalContext":"<string>"}}`
- hook 定位插件文件优先用 `CLAUDE_PLUGIN_ROOT` 环境变量，回退 `<cwd>/.claude/skills/`
- 本阶段不做：Codex 适配、`npx flowneo init`、配置开关、Schema 校验（属阶段二/三）
- `.gitignore` 忽略 `node_modules/` 与 `.flow-neo/`；`dist/` 必须入库
- 提交信息用 conventional commits（`docs:`/`chore:`/`feat:`/`test:`）

---

### Task 1: TS 工程骨架与首次提交

**Files:**
- Create: `package.json`, `tsconfig.json`, `esbuild.mjs`, `.gitignore`
- 已存在: `docs/`（v2.1 方案，尚未提交）

**Interfaces:**
- Produces: npm scripts `build`（esbuild → dist/）、`test`（vitest run）、`typecheck`（tsc --noEmit）、`lint`（build 后运行 `node dist/cli.js lint`）；后续所有 task 依赖这些脚本

- [ ] **Step 1: 提交 v2.1 方案文档**

```bash
git add docs/
git commit -m "docs: FlowNeo v2.1 技术方案（TypeScript 工具链 + 双端官方插件体系）"
```

- [ ] **Step 2: 创建 `package.json`**

```json
{
  "name": "flowneo",
  "version": "0.1.0",
  "description": "FlowNeo — 轻量跨平台 AI 编码工程工作流插件（Claude Code / Codex）",
  "type": "module",
  "bin": { "flowneo": "./dist/cli.js" },
  "scripts": {
    "build": "node esbuild.mjs",
    "test": "vitest run --passWithNoTests",
    "typecheck": "tsc --noEmit",
    "lint": "npm run build && node dist/cli.js lint"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "esbuild": "^0.24.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  },
  "engines": { "node": ">=18" }
}
```

- [ ] **Step 3: 创建 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 4: 创建 `esbuild.mjs`**（多入口单文件打包；cli 加 shebang）

```js
import { build } from 'esbuild'

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  minify: false,
  sourcemap: false,
  legalComments: 'none',
}

await build({
  ...shared,
  entryPoints: {
    'hooks/session-start': 'src/hooks/session-start.ts',
    'hooks/user-prompt-submit': 'src/hooks/user-prompt-submit.ts',
  },
  outdir: 'dist',
})

await build({
  ...shared,
  entryPoints: { cli: 'src/cli/main.ts' },
  outdir: 'dist',
  banner: { js: '#!/usr/bin/env node' },
})
```

- [ ] **Step 5: 创建 `.gitignore`**

```
node_modules/
.flow-neo/
*.log
```

- [ ] **Step 6: 安装依赖并验证脚本可用**

Run: `npm install && npm run typecheck && npm test`
Expected: 依赖安装成功；typecheck 无错误；vitest 输出 `no test files found` 但 exit 0（passWithNoTests）

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json esbuild.mjs .gitignore
git commit -m "chore: TS 工程骨架（esbuild 单文件产物 + vitest + typecheck）"
```

---

### Task 2: token 估算模块（TDD）

**Files:**
- Create: `src/lib/tokens.ts`
- Test: `tests/tokens.test.ts`

**Interfaces:**
- Produces: `estimateTokens(text: string): number`（CJK 计 1/字，其余 4 字符计 1；向上取整）

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { estimateTokens } from '../src/lib/tokens.ts'

describe('estimateTokens', () => {
  it('空字符串为 0', () => {
    expect(estimateTokens('')).toBe(0)
  })
  it('纯 ASCII 约 4 字符 1 token', () => {
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('abcdefgh')).toBe(2)
  })
  it('纯中文 1 字 1 token', () => {
    expect(estimateTokens('一二三')).toBe(3)
  })
  it('混合文本分别累计', () => {
    // 3 个中文 + 8 个 ASCII = 3 + 2 = 5
    expect(estimateTokens('一二三abcdefgh')).toBe(5)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test`
Expected: FAIL（无法解析 `../src/lib/tokens.ts`，文件不存在）

- [ ] **Step 3: 最小实现**

```ts
const CJK_RE = /[一-鿿　-〿＀-￯]/g

export function estimateTokens(text: string): number {
  const cjk = (text.match(CJK_RE) ?? []).length
  return Math.ceil(cjk + (text.length - cjk) / 4)
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test`
Expected: PASS（4 个用例全绿）

- [ ] **Step 5: Commit**

```bash
git add src/lib/tokens.ts tests/tokens.test.ts
git commit -m "feat: token 估算（CJK 1/字，其余 4 字符/token）"
```

---

### Task 3: Router 内容组装模块（TDD）

**Files:**
- Create: `src/lib/router.ts`
- Test: `tests/router.test.ts`

**Interfaces:**
- Consumes: 无（仅 node:fs / node:path）
- Produces:
  - `routerPath(cwd: string, pluginRoot?: string): string | null`
  - `readStatus(cwd: string): TaskStatus | null`，`TaskStatus = { mode: string; stage: string; task: string; raw: string }`
  - `buildSessionContext(cwd: string, pluginRoot?: string): string`
  - `buildTurnReminder(cwd: string): string`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { routerPath, readStatus, buildSessionContext, buildTurnReminder } from '../src/lib/router.ts'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'flowneo-'))
  return () => rmSync(dir, { recursive: true, force: true })
})

function put(rel: string, content: string) {
  const file = join(dir, rel)
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, content)
}

describe('routerPath', () => {
  it('优先 pluginRoot，回退 cwd/.claude/skills', () => {
    put('.claude/skills/_router/router.md', 'A')
    expect(routerPath(dir)).toBe(join(dir, '.claude/skills/_router/router.md'))
    put('plugin/skills/_router/router.md', 'B')
    expect(routerPath(dir, join(dir, 'plugin'))).toBe(join(dir, 'plugin/skills/_router/router.md'))
  })
  it('都不存在返回 null', () => {
    expect(routerPath(dir)).toBeNull()
  })
})

describe('readStatus', () => {
  it('解析 mode/stage/task，保留原文', () => {
    put('.flow-neo/current/status.md', '# 任务状态\nmode: full\nstage: 2-design-plan\ntask: 用户中心重构\n')
    const s = readStatus(dir)!
    expect(s.mode).toBe('full')
    expect(s.stage).toBe('2-design-plan')
    expect(s.task).toBe('用户中心重构')
    expect(s.raw).toContain('mode: full')
  })
  it('文件不存在返回 null', () => {
    expect(readStatus(dir)).toBeNull()
  })
})

describe('buildSessionContext', () => {
  it('Router 文本包 FLOWNEO_ROUTER 标签', () => {
    put('.claude/skills/_router/router.md', '# Router 内容')
    const ctx = buildSessionContext(dir)
    expect(ctx).toBe('<FLOWNEO_ROUTER>\n# Router 内容\n</FLOWNEO_ROUTER>')
  })
  it('存在 status 时追加 FLOWNEO_STATUS 块', () => {
    put('.claude/skills/_router/router.md', '# R')
    put('.flow-neo/current/status.md', 'mode: full\nstage: 3\n')
    const ctx = buildSessionContext(dir)
    expect(ctx).toContain('<FLOWNEO_STATUS>')
    expect(ctx).toContain('mode: full')
  })
})

describe('buildTurnReminder', () => {
  it('无 status 提示判定分流', () => {
    expect(buildTurnReminder(dir)).toContain('light/full')
  })
  it('light 模式提示直接编码', () => {
    put('.flow-neo/current/status.md', 'mode: light\ntask: 改错别字\n')
    expect(buildTurnReminder(dir)).toContain('轻量模式')
  })
  it('full 模式提示阶段纪律', () => {
    put('.flow-neo/current/status.md', 'mode: full\nstage: 2-design-plan\ntask: 重构\n')
    const r = buildTurnReminder(dir)
    expect(r).toContain('2-design-plan')
    expect(r).toContain('完整模式')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test`
Expected: FAIL（`../src/lib/router.ts` 不存在）

- [ ] **Step 3: 最小实现**

```ts
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface TaskStatus {
  mode: string
  stage: string
  task: string
  raw: string
}

export function routerPath(cwd: string, pluginRoot?: string): string | null {
  const candidates = pluginRoot
    ? [join(pluginRoot, 'skills/_router/router.md'), join(cwd, '.claude/skills/_router/router.md')]
    : [join(cwd, '.claude/skills/_router/router.md')]
  return candidates.find((p) => existsSync(p)) ?? null
}

export function readStatus(cwd: string): TaskStatus | null {
  const file = join(cwd, '.flow-neo/current/status.md')
  if (!existsSync(file)) return null
  const raw = readFileSync(file, 'utf8')
  const pick = (key: string) => raw.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? ''
  return { mode: pick('mode'), stage: pick('stage'), task: pick('task'), raw }
}

export function buildSessionContext(cwd: string, pluginRoot?: string): string {
  const rp = routerPath(cwd, pluginRoot)
  const router = rp ? readFileSync(rp, 'utf8') : ''
  const head = `<FLOWNEO_ROUTER>\n${router}\n</FLOWNEO_ROUTER>`
  const status = readStatus(cwd)
  if (!status) return head
  return `${head}\n\n<FLOWNEO_STATUS>\n${status.raw}\n</FLOWNEO_STATUS>`
}

export function buildTurnReminder(cwd: string): string {
  const s = readStatus(cwd)
  if (!s) {
    return '【FlowNeo】尚无任务状态：判定本任务 light/full 模式并写入 .flow-neo/current/status.md；full 模式按五阶段推进并遵守 Router 纪律。'
  }
  if (s.mode === 'light') {
    return `【FlowNeo】轻量模式（${s.task || '未命名'}）：直接编码 → 简易自查 → 交付，仅 status.md 一行记录，不产生其他工件。`
  }
  return `【FlowNeo】完整模式，当前阶段 ${s.stage || '?'}（${s.task || '未命名'}）：遵守该阶段纪律，产出/更新对应工件后先更新 status.md 再进入下一阶段。`
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test`
Expected: PASS（router 全部用例绿）

- [ ] **Step 5: Commit**

```bash
git add src/lib/router.ts tests/router.test.ts
git commit -m "feat: Router 内容组装与 status.md 解析"
```

---

### Task 4: 注入输出封装 + 两个 hook 入口

**Files:**
- Create: `src/lib/inject.ts`, `src/hooks/session-start.ts`, `src/hooks/user-prompt-submit.ts`
- Test: `tests/inject.test.ts`

**Interfaces:**
- Consumes: `buildSessionContext(cwd, pluginRoot?)`、`buildTurnReminder(cwd)`（Task 3）
- Produces: `hookContext(event: 'SessionStart' | 'UserPromptSubmit', context: string): string`（JSON 字符串）；dist 产物 `dist/hooks/session-start.js`、`dist/hooks/user-prompt-submit.js`

- [ ] **Step 1: 写 inject 失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { hookContext } from '../src/lib/inject.ts'

describe('hookContext', () => {
  it('输出 CC hook 标准 JSON', () => {
    const out = JSON.parse(hookContext('SessionStart', '你好'))
    expect(out.hookSpecificOutput.hookEventName).toBe('SessionStart')
    expect(out.hookSpecificOutput.additionalContext).toBe('你好')
  })
  it('转义特殊字符保持 JSON 合法', () => {
    const out = JSON.parse(hookContext('UserPromptSubmit', 'a"b\nc\\d'))
    expect(out.hookSpecificOutput.additionalContext).toBe('a"b\nc\\d')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test`
Expected: FAIL（`../src/lib/inject.ts` 不存在）

- [ ] **Step 3: 实现 inject 与两个 hook 入口**

`src/lib/inject.ts`：

```ts
export function hookContext(event: 'SessionStart' | 'UserPromptSubmit', context: string): string {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: context },
  })
}
```

`src/hooks/session-start.ts`：

```ts
import { hookContext } from '../lib/inject.ts'
import { buildSessionContext } from '../lib/router.ts'

const context = buildSessionContext(process.cwd(), process.env.CLAUDE_PLUGIN_ROOT)
process.stdout.write(hookContext('SessionStart', context))
```

`src/hooks/user-prompt-submit.ts`：

```ts
import { hookContext } from '../lib/inject.ts'
import { buildTurnReminder } from '../lib/router.ts'

const context = buildTurnReminder(process.cwd())
process.stdout.write(hookContext('UserPromptSubmit', context))
```

- [ ] **Step 4: 运行测试与构建**

Run: `npm test && npm run typecheck && npm run build`
Expected: 测试全绿；`dist/hooks/session-start.js`、`dist/hooks/user-prompt-submit.js`、`dist/cli.js` 生成（cli.js 首行 `#!/usr/bin/env node`）

- [ ] **Step 5: 管道真机验证（模拟 CC 调用 hook）**

Run:
```bash
mkdir -p .claude/skills/_router && printf '# Router 测试内容' > .claude/skills/_router/router.md
echo '{"session_id":"t"}' | node dist/hooks/session-start.js
echo '{"prompt":"继续"}' | node dist/hooks/user-prompt-submit.js
```
Expected: 第一条输出 `{"hookSpecificOutput":{...,"additionalContext":"<FLOWNEO_ROUTER>\n# Router 测试内容..."}}`；第二条输出包含 `尚无任务状态` 的提醒 JSON

- [ ] **Step 6: 清理测试残留并 Commit**

```bash
rm -rf .claude
git add src/lib/inject.ts src/hooks/ dist/
git commit -m "feat: SessionStart/UserPromptSubmit hook（esbuild 单文件产物）"
```

---

### Task 5: lint 工具（Router 体积 + 技能 frontmatter 校验，TDD）

**Files:**
- Create: `src/lib/lint.ts`, `src/cli/main.ts`
- Test: `tests/lint.test.ts`

**Interfaces:**
- Consumes: `estimateTokens(text)`（Task 2）
- Produces: `lintAll(skillsDir: string): string[]`（返回错误列表，空数组=通过）；CLI `node dist/cli.js lint`（仓库根运行，exit 1 报错）

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { lintAll } from '../src/lib/lint.ts'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'flowneo-lint-'))
  return () => rmSync(dir, { recursive: true, force: true })
})

const GOOD_SKILL = `---
name: flowneo-demo
description: FlowNeo 演示技能，用于测试 frontmatter 校验是否通过。
---
# Demo
`

function put(rel: string, content: string) {
  const file = join(dir, rel)
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, content)
}

describe('lintAll', () => {
  it('skills 目录不存在时不报技能错误（仅 router 缺失）', () => {
    const errors = lintAll(dir)
    expect(errors.length).toBe(1)
    expect(errors[0]).toContain('router.md')
  })
  it('router 超限报错，附估算值', () => {
    put('_router/router.md', '一'.repeat(2000))
    const errors = lintAll(dir)
    expect(errors.some((e) => e.includes('2000') && e.includes('1500'))).toBe(true)
  })
  it('合规 router + 技能全部通过', () => {
    put('_router/router.md', '# Router')
    put('01-demo/SKILL.md', GOOD_SKILL)
    expect(lintAll(dir)).toEqual([])
  })
  it('name 缺 flowneo- 前缀报错', () => {
    put('_router/router.md', '# Router')
    put('01-demo/SKILL.md', GOOD_SKILL.replace('flowneo-demo', 'demo'))
    expect(lintAll(dir)[0]).toContain('name')
  })
  it('description 过短报错', () => {
    put('_router/router.md', '# Router')
    put('01-demo/SKILL.md', GOOD_SKILL.replace(/description:.*/, 'description: 短'))
    expect(lintAll(dir)[0]).toContain('description')
  })
  it('子目录缺 SKILL.md 报错', () => {
    put('_router/router.md', '# Router')
    mkdirSync(join(dir, '01-demo'))
    expect(lintAll(dir)[0]).toContain('SKILL.md')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test`
Expected: FAIL（`../src/lib/lint.ts` 不存在）

- [ ] **Step 3: 实现 lint 与 CLI 入口**

`src/lib/lint.ts`：

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { estimateTokens } from './tokens.ts'

export const ROUTER_TOKEN_LIMIT = 1500
const NAME_RE = /^flowneo-[a-z0-9-]+$/
const DESC_MIN = 20

export function lintAll(skillsDir: string): string[] {
  const errors: string[] = []
  const routerFile = join(skillsDir, '_router/router.md')
  if (!existsSync(routerFile)) {
    errors.push(`缺失 ${routerFile}`)
  } else {
    const tokens = estimateTokens(readFileSync(routerFile, 'utf8'))
    if (tokens > ROUTER_TOKEN_LIMIT) {
      errors.push(`router.md 估算 ${tokens} tokens，超限 ${ROUTER_TOKEN_LIMIT}`)
    }
  }
  if (!existsSync(skillsDir)) return errors
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue
    const file = join(skillsDir, entry.name, 'SKILL.md')
    if (!existsSync(file)) {
      errors.push(`${entry.name}/ 缺少 SKILL.md`)
      continue
    }
    const text = readFileSync(file, 'utf8')
    const name = text.match(/^name:\s*(\S+)\s*$/m)?.[1]
    const desc = text.match(/^description:\s*(.+)$/m)?.[1]?.trim()
    if (!name || !NAME_RE.test(name)) {
      errors.push(`${entry.name}: name 无效（需 flowneo- 前缀，小写连字符）`)
    }
    if (!desc || desc.length < DESC_MIN) {
      errors.push(`${entry.name}: description 缺失或少于 ${DESC_MIN} 字符`)
    }
  }
  return errors
}
```

`src/cli/main.ts`：

```ts
import { lintAll } from '../lib/lint.ts'

const command = process.argv[2]

if (command === 'lint') {
  const errors = lintAll(new URL('../../skills/', import.meta.url).pathname)
  if (errors.length > 0) {
    console.error('flowneo lint 失败：\n' + errors.map((e) => ` - ${e}`).join('\n'))
    process.exit(1)
  }
  console.log('flowneo lint 通过')
} else {
  console.error('用法：flowneo lint')
  process.exit(1)
}
```

注意：`import.meta.url` 在 esbuild bundle 后指向 dist/cli.js，`../../skills/` 解析为仓库根 skills/——与「在仓库根运行」约定一致。

- [ ] **Step 4: 运行测试与构建**

Run: `npm test && npm run build`
Expected: 测试全绿；构建成功

- [ ] **Step 5: Commit**

```bash
git add src/lib/lint.ts src/cli/main.ts tests/lint.test.ts dist/
git commit -m "feat: flowneo lint（Router ≤1500 tokens + 技能 frontmatter 校验）"
```

---

### Task 6: Router 内容

**Files:**
- Create: `skills/_router/router.md`

**Interfaces:**
- Produces: Router 全文（被 `dist/hooks/session-start.js` 读取注入；阶段二同步生成 Codex AGENTS.md 标记段）

- [ ] **Step 1: 写入 Router 全文**

```markdown
<SUBAGENT-STOP>
如果你是被派发执行具体任务的子代理，忽略本 Router，直接完成你的任务。
</SUBAGENT-STOP>

# FlowNeo 工程工作流调度核心（Router）

你在 FlowNeo 工程工作流约束下工作。每次接到用户需求时先执行：读取 .flow-neo/current/status.md（存在则恢复断点续作；不存在则按下述规则判定模式并创建该文件）。

## 任务分流（首个需求判定一次，结果写入 status.md）

- **轻量（light）**：改 Bug、改配置、补注释、局部微调（影响 ≤2 个文件、无设计变更）→ 直接编码 → 简易自查 → 交付。除 status.md 一行外不产生任何工件。
- **复杂（full）**：新功能、模块重构、数据表/接口设计、多文件变更 → 严格走五阶段。
- 用户说「走轻量/完整流程」时立即切换并更新 status.md。

## 五阶段（full 模式串行推进，禁止跳阶段）

| 阶段 | 调用技能（Skill 工具） | 产出工件（.flow-neo/current/） |
|---|---|---|
| 1 需求探索 | flowneo-need-explore | 01-need-explore.md |
| 2 方案设计 | flowneo-design-plan | 02-design-plan.md |
| 3 编码执行 | flowneo-task-execute | 03-task-record.md |
| 4 代码审查 | flowneo-code-review | 04-code-review.md |
| 5 交付归档 | flowneo-git-archive | 05-archive-summary.md |

## 流转纪律（硬约束）

1. 上一阶段工件未写入 .flow-neo/current/，禁止进入下一阶段
2. 每次阶段或模式变更，同步更新 status.md（mode/stage/task/artifacts/updated 五字段）
3. 编码严格依据 02-design-plan.md 的任务拆解，禁止自由发挥；设计未覆盖时先补设计再编码
4. 工件仅写入 .flow-neo/，文件名固定禁止改名，不预建空文件（阶段完成才落盘）
5. 任务交付后由阶段 5 将 current/ 迁移至 history/<YYYYMMDD>-<标识>/ 快照，绝不覆盖历史

## Red Flags——出现以下念头立即停下（它们是合理化借口，不是理由）

| 念头 | 现实 |
|---|---|
| 「需求很清楚，不用做需求探索」 | 清楚是错觉；至少要落边界与验收标准 |
| 「这个改动简单，直接写」 | 简单与否由分流规则判定，不是由兴奋度判定 |
| 「设计文档可以编码后再补」 | 禁止；02 是编码唯一依据，先设计后编码 |
| 「任务太小，不用记 03 记录」 | full 模式下所有任务逐项记录，无例外 |
| 「先跳过审查，用户等着要」 | 审查是交付前提，缩报告可以、跳审查不行 |
| 「我先看看代码再决定走哪个流程」 | 先判定模式写入 status.md，再动任何工具 |

## 上下文纪律

- 超长文件/日志/Diff 只保留结论与关键片段（各 ≤50 行），禁止整段复读工具输出
- 会话恢复时凭 status.md 与现有工件断点续作，不重跑已完成阶段

> 用户显式指令（CLAUDE.md、直接要求）优先级高于本 Router；冲突时服从用户并说明。
```

- [ ] **Step 2: lint 验证体积达标**

Run: `npm run lint`
Expected: `flowneo lint 通过`（Router 估算约 1200~1350 tokens ≤ 1500；此时 skills/ 下尚无阶段技能，不报错。若超限，优先精简 Red Flags 表行数）

- [ ] **Step 3: Commit**

```bash
git add skills/_router/router.md
git commit -m "feat: Router 调度核心（分流规则+五阶段状态机+流转纪律）"
```

---

### Task 7: 阶段技能 01 需求探索 + 02 四阶设计

**Files:**
- Create: `skills/01-need-explore/SKILL.md`, `skills/02-design-plan/SKILL.md`

**Interfaces:**
- Consumes: Router 定义的 status.md 字段与工件路径
- Produces: 技能 `flowneo-need-explore`、`flowneo-design-plan`（frontmatter name 供 lint 与后续引用）

- [ ] **Step 1: 写 `skills/01-need-explore/SKILL.md` 全文**

```markdown
---
name: flowneo-need-explore
description: FlowNeo 阶段一·需求探索。当任务为完整（full）模式且处于阶段 1 时使用。澄清模糊需求、锁定边界与验收标准，产出 .flow-neo/current/01-need-explore.md 并将 status.md 推进到阶段 2。
---

# 阶段一：需求探索

目标：澄清模糊需求、锁定需求边界、排除无效诉求，杜绝开发中途改需求、漏需求。

## 执行步骤

1. 初始化：若 .flow-neo/current/status.md 不存在则创建，写入 mode: full、stage: 1、task: <一句话任务名>、artifacts: []、updated: <当前时间>
2. 拆解用户原始需求，提炼核心开发目标
3. 逐项明确：需求边界与不做事项、运行环境与兼容要求、验收标准
4. 存在模糊点时一次性列出全部疑问向用户确认（禁止拆成多轮）；无法确认的给出假设并显式标注
5. 按下方模板写入 .flow-neo/current/01-need-explore.md
6. 更新 status.md：stage: 2，artifacts 追加 01-need-explore.md
7. 用 Skill 工具调用 flowneo-design-plan 进入阶段二

## 01-need-explore.md 模板

# 需求探索纪要：<任务名>

## 用户原始需求
<原文摘录>

## 核心开发目标
- <目标>

## 需求边界与不做事项
- 边界：
- 不做：

## 运行环境与兼容要求
- <环境/版本/兼容>

## 验收标准
- <可验证条目>

## 待确认问题与结论
- Q：<问题> → A：<结论 或 【假设】>

## 完成条件

status.md 已更新至 stage: 2；边界与验收标准已经用户确认或标注假设。
```

- [ ] **Step 2: 写 `skills/02-design-plan/SKILL.md` 全文**

```markdown
---
name: flowneo-design-plan
description: FlowNeo 阶段二·结构化四阶方案设计。当 status.md 的 stage 为 2 时使用。产出唯一设计文档 .flow-neo/current/02-design-plan.md，固定四阶：需求规格、功能设计、架构/数据设计、任务拆解，作为编码与审查的唯一依据。
---

# 阶段二：结构化四阶方案设计

目标：定标准、定业务、定底层、定落地路径。本文档是后续编码与审查的唯一依据，规格与设计合一、不重复。

<HARD-GATE>
02-design-plan.md 四段未齐全、且未经用户确认（或标注假设）前，禁止创建/修改任何业务代码文件。
</HARD-GATE>

## 执行步骤

1. 读取 01-need-explore.md（若为轻量简化启动则直接读用户需求）
2. 依次完成四阶设计（模板四段固定，不可缺省；不适用的字段标注「不适用」）
3. 写入 .flow-neo/current/02-design-plan.md
4. 更新 status.md：stage: 3，artifacts 追加 02-design-plan.md
5. 用 Skill 工具调用 flowneo-task-execute 进入阶段三

## 02-design-plan.md 模板（四阶固定）

# 方案设计：<任务名>

## 一、需求规格（定标准）

- 验收标准：<可测条目，逐条编号>
- 准入条件：
- 异常场景：
- 兼容规则：
- 禁止事项：

## 二、功能设计（定业务）

- 模块拆分：
- 业务流程：<步骤或时序描述>
- 输入输出：
- 分支与异常处理：
- 交互闭环：

## 三、架构/数据设计（定底层）

- 后端：数据表（表名/字段/索引/关联）、接口（方法/路径/参数/返回）
- 前端/脚本：架构、组件、状态、目录结构
- <按任务类型取其一，另一项标注「不适用」>

## 四、任务拆解（定落地）

| # | 最小任务 | 优先级 | 依赖 | 涉及文件 |
|---|---------|-------|------|---------|
| 1 | | | | |

## 完成条件

四段齐全；任务均为最小可执行粒度；status.md 已更新至 stage: 3。
```

- [ ] **Step 3: lint 验证 frontmatter**

Run: `npm run lint`
Expected: `flowneo lint 通过`

- [ ] **Step 4: Commit**

```bash
git add skills/01-need-explore skills/02-design-plan
git commit -m "feat: 阶段技能 01 需求探索 + 02 四阶结构化设计"
```

---

### Task 8: 阶段技能 03 编码执行 + 04 代码审查 + 05 交付归档

**Files:**
- Create: `skills/03-task-execute/SKILL.md`, `skills/04-code-review/SKILL.md`, `skills/05-git-archive/SKILL.md`

**Interfaces:**
- Consumes: `02-design-plan.md` 任务拆解表（04 审查对照、05 归档索引）
- Produces: 技能 `flowneo-task-execute`、`flowneo-code-review`、`flowneo-git-archive`

- [ ] **Step 1: 写 `skills/03-task-execute/SKILL.md` 全文**

```markdown
---
name: flowneo-task-execute
description: FlowNeo 阶段三·分任务编码执行。当 status.md 的 stage 为 3 时使用。严格按 02-design-plan.md 的任务拆解逐项编码并记录至 .flow-neo/current/03-task-record.md，全部完成后推进到阶段 4。
---

# 阶段三：分任务编码执行

目标：严格按 02-design-plan.md 逐任务落地，保证开发与设计一致。

<HARD-GATE>
只能实施 02-design-plan.md「四、任务拆解」表中列出的任务；表外变更必须先回写 02 再实施。
</HARD-GATE>

## 执行步骤

1. 读取 02-design-plan.md「四、任务拆解」
2. 按优先级与依赖顺序逐项执行：编码 → 自测（可运行则实际运行验证）→ 在 03-task-record.md 表格记一行
3. 遇到设计未覆盖的情况：先回写补充 02-design-plan.md 再编码，禁止即兴偏离
4. 全部任务完成后汇总自测结果，更新 status.md：stage: 4，artifacts 追加 03-task-record.md
5. 用 Skill 工具调用 flowneo-code-review 进入阶段四

## 03-task-record.md 模板

# 编码执行记录：<任务名>

| # | 任务 | 状态 | 变更文件 | 问题与解决 |
|---|------|------|---------|-----------|

## 自测结果
- <执行了什么验证，结果如何>

## 完成条件

拆解表内任务全部 done；无未记录的文件变更；status.md 已更新至 stage: 4。
```

- [ ] **Step 2: 写 `skills/04-code-review/SKILL.md` 全文**

```markdown
---
name: flowneo-code-review
description: FlowNeo 阶段四·代码自查审查。当 status.md 的 stage 为 4 时使用。对照 02-design-plan.md 审查全部变更（设计一致性/逻辑边界/规范/性能安全），修复问题并产出 .flow-neo/current/04-code-review.md。
---

# 阶段四：代码自查审查

目标：自查漏洞、规范代码、对齐设计、修复隐性 Bug。所有代码变更必须审查。

## 审查清单（逐项执行）

1. 设计一致性：实现与 02-design-plan.md 逐条比对，偏差要么修复、要么回写设计
2. 逻辑与边界：空值、越界、并发、资源释放、异常路径
3. 代码规范：命名、重复代码、死代码、无用依赖
4. 性能与安全：N+1 查询、超大内存占用、注入/XSS/敏感信息硬编码
5. 修复发现的问题并逐条记录

## 04-code-review.md 模板

# 代码审查报告：<任务名>

## 审查范围
<变更文件清单>

## 审查结果
| 类别 | 问题 | 严重度 | 处理 |
|------|------|-------|------|

## 设计一致性比对
- <逐条结论>

## 完成条件

清单 5 项全部执行；发现的问题全部处理；status.md 更新至 stage: 5；用 Skill 工具调用 flowneo-git-archive。
```

- [ ] **Step 3: 写 `skills/05-git-archive/SKILL.md` 全文**

```markdown
---
name: flowneo-git-archive
description: FlowNeo 阶段五·交付归档。当 status.md 的 stage 为 5 时使用。产出 .flow-neo/current/05-archive-summary.md，将 current 全套工件迁移至 .flow-neo/history/<YYYYMMDD>-<标识>/ 快照并重建空 current。
---

# 阶段五：交付归档

目标：汇总交付成果、沉淀复盘、形成版本快照，绝不覆盖历史。

## 执行步骤

1. 按模板写入 .flow-neo/current/05-archive-summary.md
2. 若项目使用 git：按项目提交规范提交代码变更（.flow-neo/ 是否入库遵循项目 .gitignore）
3. 归档迁移：mkdir -p .flow-neo/history && mv .flow-neo/current .flow-neo/history/<YYYYMMDD>-<任务英文简写或版本>/
4. 重建空 current/ 目录（mkdir .flow-neo/current）
5. 向用户汇报交付总结与归档路径

## 05-archive-summary.md 模板

# 交付归档：<任务名>

## 功能总结
## 变更文件清单
## 核心实现复盘
## 遗留问题与迭代建议
## 工件索引
- 01~05 全部工件路径

## 完成条件

history/ 下快照完整（01~05 + status.md）；current/ 已重建为空；用户已收到交付汇报。
```

- [ ] **Step 4: lint 全量验证**

Run: `npm run lint`
Expected: `flowneo lint 通过`（5 技能 frontmatter + Router 体积全部达标）

- [ ] **Step 5: Commit**

```bash
git add skills/03-task-execute skills/04-code-review skills/05-git-archive
git commit -m "feat: 阶段技能 03 编码执行 + 04 代码审查 + 05 交付归档"
```

---

### Task 9: 插件清单 + 本地 marketplace 安装 + 端到端验收

**Files:**
- Create: `hooks/hooks.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`

**Interfaces:**
- Consumes: `dist/hooks/*.js`（Task 4）、`skills/`（Task 6-8）
- Produces: 可安装插件 `flowneo@flowneo-marketplace`

- [ ] **Step 1: 写 `hooks/hooks.json`**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          { "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/dist/hooks/session-start.js\"", "async": false }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          { "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/dist/hooks/user-prompt-submit.js\"", "async": false }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: 写 `.claude-plugin/plugin.json`**

```json
{
  "name": "flowneo",
  "description": "FlowNeo — 轻量工程工作流：精简 Router 持续注入 + 五阶段闭环 + 四阶结构化设计",
  "version": "0.1.0",
  "author": { "name": "huangjian" },
  "homepage": "https://github.com/huangjian/flowneo",
  "repository": "https://github.com/huangjian/flowneo",
  "license": "MIT",
  "keywords": ["workflow", "skills", "router", "engineering"]
}
```

- [ ] **Step 3: 写 `.claude-plugin/marketplace.json`**

```json
{
  "name": "flowneo-marketplace",
  "description": "FlowNeo 本地开发市场",
  "owner": { "name": "huangjian" },
  "plugins": [
    {
      "name": "flowneo",
      "description": "FlowNeo — 轻量工程工作流插件",
      "version": "0.1.0",
      "source": "./",
      "author": { "name": "huangjian" }
    }
  ]
}
```

- [ ] **Step 4: Commit 清单文件**

```bash
git add hooks/hooks.json .claude-plugin/
git commit -m "feat: 插件清单与 hooks 注册（CC 本地 marketplace 可安装）"
```

- [ ] **Step 5: 本地 marketplace 安装**

Run:
```bash
claude plugin marketplace add /Users/huangjian/workspace/cursor/flowNeo
claude plugin install flowneo@flowneo-marketplace
claude plugin list
```
Expected: marketplace 添加成功；插件列表出现 flowneo 0.1.0

- [ ] **Step 6: 非交互会话验证注入与技能触发**

Run:
```bash
claude -p '不使用任何工具，复述你收到的 FLOWNEO_ROUTER 标签内容的第一行标题' 2>/dev/null | tail -3
```
Expected: 输出包含「FlowNeo 工程工作流调度核心（Router）」，证明 SessionStart 注入生效

Run（技能触发与 premature-action 检测，superpowers 同款测试法）:
```bash
claude -p '这个项目需要新增一个 scripts/greet.sh 问候脚本，请开始' --max-turns 3 --output-format stream-json 2>/dev/null > /tmp/flowneo-e2e.jsonl
grep -c '"name":"Skill"' /tmp/flowneo-e2e.jsonl
head -40 /tmp/flowneo-e2e.jsonl | grep -o '"name":"[A-Za-z]*"' | head -5
```
Expected: Skill 调用次数 ≥1；且首个工具调用事件是 `Skill`（若首个是 Edit/Write 而 Skill 数为 0，说明模型绕过流程直接动手——回修 Router 分流与 Red Flags 话术后重测）

- [ ] **Step 7: 端到端人工验收（交互会话，需要用户配合）**

1. 新开会话输入 `/context`：确认 FlowNeo 相关常驻注入（Router + 5 技能元数据）合计 ≤ 2K tokens
2. 轻任务走查：「帮我在 README 加一行说明」→ 预期：仅 status.md 一行（mode: light），无其他工件
3. 重任务走查：提一个小型完整需求（如「新增 scripts/hello.sh 输出问候」）→ 预期：五阶段技能依次触发，`01~05` 工件齐全，归档后 `history/` 出现快照、current 清空
4. 断点恢复走查：重任务进行到阶段 2~3 时中断会话（Ctrl+C），重开会话直接说「继续」→ 预期：凭 status.md 恢复到断点阶段，不重跑已完成阶段

- [ ] **Step 8: 修复验收中发现的问题并最终提交**

按验收发现的问题修复（技能话术/hook 细节），每项修复独立提交；全部通过后：

```bash
git add -A
git commit -m "chore: 阶段一 MVP 验收修复收尾"
```

---

## Self-Review 记录

- **Spec 覆盖**：v2.1 方案阶段一清单逐项核对——TS 工程（T1）、两 hook（T3/T4）、Router（T6）、5 技能（T7/T8）、插件清单与 hooks 注册（T9）、本地 marketplace 安装（T9）、轻重分流（Router+T7 技能）、断点恢复（Router 纪律+T9 验收）、`/context` ≤2K（T9 验收）、lint（T2/T5）。config 开关/Codex/npx init/Schema 校验为阶段二三范围，已排除。
- **占位符**：全部代码与模板已给全文，无 TBD。
- **类型一致性**：`estimateTokens(text)`、`routerPath(cwd, pluginRoot?)`、`readStatus(cwd)`、`buildSessionContext(cwd, pluginRoot?)`、`buildTurnReminder(cwd)`、`hookContext(event, context)`、`lintAll(skillsDir)` 在各 Task 间签名一致。
