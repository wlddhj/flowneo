# FlowNeo 多任务并行支持实施计划（v0.2.0）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 FlowNeo 从单活跃任务（`.flow-neo/current/`）升级为多任务并行模型（`.flow-neo/tasks/<slug>/` + 会话级绑定 `sessions/`），CC 端做到机制级多会话互不干扰。

**Architecture:** 新增 `src/lib/tasks.ts`（slug/绑定/任务列表/会话清理/stdin 解析），改造 `src/lib/router.ts`（按 taskId 寻址、绑定感知注入），两个 hook 读 stdin session_id；Router 与 5 技能话术全面切换到 tasks/ 模型；版本 0.1.0→0.2.0，技术方案文档升 v2.2。

**Tech Stack:** TypeScript 5 / Node ≥18 / esbuild / vitest（既有工程，零新增依赖）

**Spec:** `docs/superpowers/specs/2026-08-27-multi-task-design.md`（已用户确认）

## Global Constraints

- 目录模型：`.flow-neo/tasks/<slug>/`（status.md + 01~05 工件，懒生成）、`.flow-neo/sessions/<session-id>.md`（一行 `task: <slug>`）、`.flow-neo/history/<YYYYMMDD>-<slug>/`
- status.md 字段固定五字段：`task / slug / stage / artifacts / updated`（**无 mode 字段**）
- 轻任务零痕迹：不建目录、不写文件
- 重任务必须「任务目录 + 会话绑定」齐备才能动工（无绑定动重活 = Red Flag）
- 注入体积：任务列表 ≤5 行（超出显示「…及 N 个」）；Router ≤1500 tokens（lint 卡点不变）
- 会话绑定文件 7 天自动清理（按 mtime）
- slug 冲突 -2、-3 递增（与归档去重同规则）
- hook 任何异常下 exit 0 + 输出合法 JSON（safe* 包装既有兜底必须保持）
- 运行时零外部依赖；dist/ 产物入库且与 src 同步（`npm run verify` 把关）
- 版本 0.2.0 三处同步：`package.json`、`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`
- 提交信息 conventional commits
- Codex 端：无 session_id，跳过绑定写入，Router 话术引导「动重活前看 tasks/」（引导级，不虚构机制）

---

### Task 1: tasks.ts 新模块——slug/绑定/列表/清理（TDD）

**Files:**
- Create: `src/lib/tasks.ts`
- Test: `tests/tasks.test.ts`

**Interfaces:**
- Produces（后续任务依赖的精确签名）:
  - `makeSlug(name: string, existing: string[]): string` —— 清洗非法字符（空格/下划线/斜杠/点→`-`，压缩连续 `-`，trim 前后 `-`）；空结果回退 `task`；与 existing 重名时追加 `-2`、`-3` 递增
  - `readBinding(cwd: string, sessionId: string): string | null` —— 读 `.flow-neo/sessions/<sessionId>.md` 中的 `task: <slug>` 行
  - `writeBinding(cwd: string, sessionId: string, slug: string): void` —— 写一行 `task: <slug>`（自动建目录，覆盖式）
  - `listTasks(cwd: string): TaskSummary[]`，`TaskSummary = { slug: string; task: string; stage: string }` —— 读 `tasks/*/status.md` 摘要，按 slug 字典序
  - `cleanSessions(cwd: string, maxAgeMs: number): number` —— 删除 mtime 超龄的 `sessions/*.md`，返回删除数
  - `parseSessionId(input: string): string | null` —— 纯函数：解析 hook stdin JSON 取 `session_id`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  makeSlug, readBinding, writeBinding, listTasks, cleanSessions, parseSessionId,
} from '../src/lib/tasks.ts'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'flowneo-tasks-'))
  return () => rmSync(dir, { recursive: true, force: true })
})

describe('makeSlug', () => {
  it('空格/下划线/斜杠转连字符并压缩', () => {
    expect(makeSlug('用户中心 重构', [])).toBe('用户中心-重构')
    expect(makeSlug('a_b/c..d', [])).toBe('a-b-c-d')
  })
  it('空结果回退 task', () => {
    expect(makeSlug('///', [])).toBe('task')
  })
  it('与既有冲突时递增后缀', () => {
    expect(makeSlug('login', ['login'])).toBe('login-2')
    expect(makeSlug('login', ['login', 'login-2'])).toBe('login-3')
  })
})

describe('readBinding/writeBinding', () => {
  it('写入后可读回，未绑定返回 null', () => {
    expect(readBinding(dir, 's1')).toBeNull()
    writeBinding(dir, 's1', 'user-center')
    expect(readBinding(dir, 's1')).toBe('user-center')
    expect(readBinding(dir, 's2')).toBeNull()
  })
})

describe('listTasks', () => {
  it('读取各任务摘要并按 slug 排序', () => {
    for (const [slug, task, stage] of [['b-task', '任务B', '2'], ['a-task', '任务A', '1']] as const) {
      mkdirSync(join(dir, 'tasks', slug), { recursive: true })
      writeFileSync(join(dir, 'tasks', slug, 'status.md'), `task: ${task}\nslug: ${slug}\nstage: ${stage}\n`)
    }
    expect(listTasks(dir)).toEqual([
      { slug: 'a-task', task: '任务A', stage: '1' },
      { slug: 'b-task', task: '任务B', stage: '2' },
    ])
  })
  it('tasks 目录不存在返回空数组', () => {
    expect(listTasks(dir)).toEqual([])
  })
})

describe('cleanSessions', () => {
  it('删除超龄绑定文件，保留新文件，返回删除数', () => {
    mkdirSync(join(dir, 'sessions'), { recursive: true })
    const old = join(dir, 'sessions', 'old.md')
    const fresh = join(dir, 'sessions', 'fresh.md')
    writeFileSync(old, 'task: a')
    writeFileSync(fresh, 'task: b')
    const week = 7 * 24 * 3600 * 1000
    utimesSync(old, new Date(Date.now() - week - 1000), new Date(Date.now() - week - 1000))
    expect(cleanSessions(dir, week)).toBe(1)
    expect(readBinding(dir, 'old')).toBeNull()
    expect(readBinding(dir, 'fresh')).toBe('b')
  })
})

describe('parseSessionId', () => {
  it('从 stdin JSON 提取 session_id', () => {
    expect(parseSessionId('{"session_id":"abc-123","prompt":"hi"}')).toBe('abc-123')
  })
  it('非法 JSON 或缺字段返回 null', () => {
    expect(parseSessionId('not json')).toBeNull()
    expect(parseSessionId('{"foo":1}')).toBeNull()
    expect(parseSessionId('')).toBeNull()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test`
Expected: FAIL（`../src/lib/tasks.ts` 不存在）

- [ ] **Step 3: 最小实现**

```ts
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface TaskSummary {
  slug: string
  task: string
  stage: string
}

export function makeSlug(name: string, existing: string[]): string {
  const base = name.trim().replace(/[\s_/.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'task'
  if (!existing.includes(base)) return base
  let n = 2
  while (existing.includes(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export function readBinding(cwd: string, sessionId: string): string | null {
  const file = join(cwd, '.flow-neo/sessions', `${sessionId}.md`)
  if (!existsSync(file)) return null
  return readFileSync(file, 'utf8').match(/^task:\s*(\S+)\s*$/m)?.[1] ?? null
}

export function writeBinding(cwd: string, sessionId: string, slug: string): void {
  const dir = join(cwd, '.flow-neo/sessions')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${sessionId}.md`), `task: ${slug}\n`)
}

export function listTasks(cwd: string): TaskSummary[] {
  const dir = join(cwd, '.flow-neo/tasks')
  if (!existsSync(dir)) return []
  const out: TaskSummary[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = join(dir, entry.name, 'status.md')
    if (!existsSync(file)) continue
    const raw = readFileSync(file, 'utf8')
    const pick = (key: string) => raw.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? ''
    out.push({ slug: entry.name, task: pick('task'), stage: pick('stage') })
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug))
}

export function cleanSessions(cwd: string, maxAgeMs: number): number {
  const dir = join(cwd, '.flow-neo/sessions')
  if (!existsSync(dir)) return 0
  let removed = 0
  const cutoff = Date.now() - maxAgeMs
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.md')) continue
    const file = join(dir, f)
    if (statSync(file).mtimeMs < cutoff) {
      rmSync(file)
      removed++
    }
  }
  return removed
}

export function parseSessionId(input: string): string | null {
  try {
    const v = JSON.parse(input)?.session_id
    return typeof v === 'string' && v.length > 0 ? v : null
  } catch {
    return null
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test`
Expected: PASS（tasks 12 用例 + 既有用例全绿）

- [ ] **Step 5: Commit**

```bash
git add src/lib/tasks.ts tests/tasks.test.ts
git commit -m "feat: tasks 模块——slug 生成、会话绑定、任务列表、过期清理、stdin 解析"
```

---

### Task 2: router.ts 改造——按任务寻址 + 绑定感知注入（TDD）

**Files:**
- Modify: `src/lib/router.ts`（整体重写）
- Modify: `tests/router.test.ts`（整体重写）

**Interfaces:**
- Consumes: `readBinding(cwd, sessionId)`、`listTasks(cwd)`（Task 1）
- Produces（Task 3 的 hook 依赖）:
  - `readStatus(cwd: string, slug: string): TaskStatus | null`，`TaskStatus = { task: string; slug: string; stage: string; raw: string }`
  - `buildSessionContext(cwd: string, pluginRoot: string | undefined, sessionId: string | null): string`
  - `buildTurnReminder(cwd: string, sessionId: string | null): string`
  - `safeSessionContext(cwd: string, pluginRoot: string | undefined, sessionId: string | null): string`（异常返回 `''`）
  - `safeTurnReminder(cwd: string, sessionId: string | null): string`（异常返回 `''`）
  - `routerPath(cwd, pluginRoot?)` 签名不变

- [ ] **Step 1: 重写测试**

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  routerPath, readStatus, buildSessionContext, buildTurnReminder,
  safeSessionContext, safeTurnReminder,
} from '../src/lib/router.ts'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'flowneo-router-'))
  return () => rmSync(dir, { recursive: true, force: true })
})

function put(rel: string, content: string) {
  const file = join(dir, rel)
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, content)
}

function setupTask(slug: string, stage: string) {
  put(`.flow-neo/tasks/${slug}/status.md`, `task: 任务${slug}\nslug: ${slug}\nstage: ${stage}\n`)
}

describe('readStatus（按任务寻址）', () => {
  it('读取指定任务的 status', () => {
    setupTask('a', '2')
    const s = readStatus(dir, 'a')!
    expect(s.slug).toBe('a')
    expect(s.stage).toBe('2')
    expect(s.task).toBe('任务a')
  })
  it('任务不存在返回 null', () => {
    expect(readStatus(dir, 'nope')).toBeNull()
  })
})

describe('buildSessionContext', () => {
  it('有绑定：Router + 本任务 status', () => {
    put('.claude/skills/_router/router.md', '# R')
    setupTask('a', '3')
    put('.flow-neo/sessions/s1.md', 'task: a\n')
    const ctx = buildSessionContext(dir, undefined, 's1')
    expect(ctx).toContain('<FLOWNEO_ROUTER>')
    expect(ctx).toContain('<FLOWNEO_STATUS>')
    expect(ctx).toContain('stage: 3')
  })
  it('无绑定：Router + 任务列表', () => {
    put('.claude/skills/_router/router.md', '# R')
    setupTask('a', '1')
    setupTask('b', '4')
    const ctx = buildSessionContext(dir, undefined, null)
    expect(ctx).toContain('<FLOWNEO_TASKS>')
    expect(ctx).toContain('a（阶段 1）')
    expect(ctx).toContain('b（阶段 4）')
    expect(ctx).not.toContain('<FLOWNEO_STATUS>')
  })
  it('sessionId 为 null 时不读 sessions', () => {
    put('.claude/skills/_router/router.md', '# R')
    const ctx = buildSessionContext(dir, undefined, null)
    expect(ctx).toContain('无进行中任务')
  })
})

describe('buildTurnReminder', () => {
  it('有绑定：本任务阶段纪律 + 其他任务列表', () => {
    setupTask('a', '2')
    setupTask('b', '4')
    put('.flow-neo/sessions/s1.md', 'task: a\n')
    const r = buildTurnReminder(dir, 's1')
    expect(r).toContain('完整任务 a（任务a）')
    expect(r).toContain('阶段 2')
    expect(r).toContain('其他任务：b（阶段 4）')
  })
  it('其他任务超过 5 个截断显示计数', () => {
    put('.flow-neo/sessions/s1.md', 'task: a\n')
    setupTask('a', '1')
    for (const s of ['b', 'c', 'd', 'e', 'f', 'g']) setupTask(s, '1')
    const r = buildTurnReminder(dir, 's1')
    expect(r).toContain('…及 1 个')
    expect(r).not.toContain('g（阶段 1）')
  })
  it('无绑定：三分支提醒 + 任务列表', () => {
    setupTask('a', '2')
    const r = buildTurnReminder(dir, null)
    expect(r).toContain('未绑定任务')
    expect(r).toContain('新任务')
    expect(r).toContain('继续')
    expect(r).toContain('轻任务')
    expect(r).toContain('a（阶段 2）')
  })
  it('无绑定且无任务：纯三分支提醒', () => {
    expect(buildTurnReminder(dir, null)).toContain('未绑定任务')
  })
})

describe('safe 包装', () => {
  it('IO 异常返回空串不抛出', () => {
    mkdirSync(join(dir, '.flow-neo/tasks/x/status.md'), { recursive: true })
    expect(safeSessionContext(dir, undefined, null)).toBeTypeOf('string')
    expect(safeTurnReminder(dir, null)).toBeTypeOf('string')
  })
})
```

注：`safeSessionContext` 在无 router.md 且无 tasks 时正常返回非空（空标签），仅 IO 异常返回 `''`；上述 EISDIR 用例实际触发 `listTasks` 的 `readFileSync` 异常路径。

- [ ] **Step 2: 运行确认失败**

Run: `npm test`
Expected: FAIL（router.ts 旧签名：`readStatus` 需要 2 参 / `buildSessionContext` 第 3 参不存在等）

- [ ] **Step 3: 重写实现**

```ts
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { listTasks, readBinding } from './tasks.ts'

export interface TaskStatus {
  task: string
  slug: string
  stage: string
  raw: string
}

export function routerPath(cwd: string, pluginRoot?: string): string | null {
  const candidates = pluginRoot
    ? [join(pluginRoot, 'skills/_router/router.md'), join(cwd, '.claude/skills/_router/router.md')]
    : [join(cwd, '.claude/skills/_router/router.md')]
  return candidates.find((p) => existsSync(p)) ?? null
}

export function readStatus(cwd: string, slug: string): TaskStatus | null {
  const file = join(cwd, '.flow-neo/tasks', slug, 'status.md')
  if (!existsSync(file)) return null
  const raw = readFileSync(file, 'utf8')
  const pick = (key: string) => raw.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? ''
  return { task: pick('task'), slug: pick('slug'), stage: pick('stage'), raw }
}

function formatTaskList(cwd: string): string {
  const tasks = listTasks(cwd)
  if (tasks.length === 0) return '无进行中任务'
  return tasks.map((t) => `${t.slug}（阶段 ${t.stage || '?'}）`).join('、')
}

function formatOtherTasks(cwd: string, exceptSlug: string): string {
  const others = listTasks(cwd).filter((t) => t.slug !== exceptSlug)
  if (others.length === 0) return ''
  const MAX = 5
  const shown = others.slice(0, MAX).map((t) => `${t.slug}（阶段 ${t.stage || '?'}）`).join('、')
  return others.length > MAX ? `${shown}…及 ${others.length - MAX} 个` : shown
}

export function buildSessionContext(cwd: string, pluginRoot: string | undefined, sessionId: string | null): string {
  const rp = routerPath(cwd, pluginRoot)
  const router = rp ? readFileSync(rp, 'utf8') : ''
  const head = `<FLOWNEO_ROUTER>\n${router}\n</FLOWNEO_ROUTER>`
  const slug = sessionId ? readBinding(cwd, sessionId) : null
  if (slug) {
    const status = readStatus(cwd, slug)
    if (status) return `${head}\n\n<FLOWNEO_STATUS>\n${status.raw}\n</FLOWNEO_STATUS>`
  }
  return `${head}\n\n<FLOWNEO_TASKS>\n${formatTaskList(cwd)}\n</FLOWNEO_TASKS>`
}

export function buildTurnReminder(cwd: string, sessionId: string | null): string {
  const slug = sessionId ? readBinding(cwd, sessionId) : null
  const status = slug ? readStatus(cwd, slug) : null
  if (status) {
    const others = formatOtherTasks(cwd, status.slug)
    const otherPart = others ? `其他任务：${others}。` : ''
    return `【FlowNeo】完整任务 ${status.slug}（${status.task || '未命名'}），当前阶段 ${status.stage || '?'}：遵守该阶段纪律，产出/更新对应工件后先更新 status.md 再进入下一阶段。${otherPart}`
  }
  const tasks = formatTaskList(cwd)
  const taskPart = tasks === '无进行中任务' ? '' : `进行中任务：${tasks}。`
  return `【FlowNeo】本会话未绑定任务：重任务→说「新任务 <名称>」创建并绑定；继续既有→说「继续 <名称或slug>」；轻任务→直接做，不留任何文件。${taskPart}`
}

export function safeSessionContext(cwd: string, pluginRoot: string | undefined, sessionId: string | null): string {
  try {
    return buildSessionContext(cwd, pluginRoot, sessionId)
  } catch {
    return ''
  }
}

export function safeTurnReminder(cwd: string, sessionId: string | null): string {
  try {
    return buildTurnReminder(cwd, sessionId)
  } catch {
    return ''
  }
}
```

- [ ] **Step 4: 运行确认通过 + typecheck**

Run: `npm test && npm run typecheck`
Expected: 全绿（注意：hooks 入口仍用旧签名会 typecheck 报错——**同时**把两个 hook 入口改为 Task 3 的最终形态，见 Step 5；本步允许先只跑 `npm test`，typecheck 合并到 Task 3 验证）

- [ ] **Step 5: Commit**

```bash
git add src/lib/router.ts tests/router.test.ts
git commit -m "feat: router 模块多任务化——按任务寻址、绑定感知注入、任务列表"
```

---

### Task 3: hook 入口改造 + stdin 读取 + 管道验证

**Files:**
- Modify: `src/hooks/session-start.ts`、`src/hooks/user-prompt-submit.ts`
- Modify: `tests/inject.test.ts`（不变，仅确认未破坏）

**Interfaces:**
- Consumes: `safeSessionContext(cwd, pluginRoot, sessionId)`、`safeTurnReminder(cwd, sessionId)`、`parseSessionId(input)`、`cleanSessions(cwd, maxAgeMs)`

- [ ] **Step 1: 重写 `src/hooks/session-start.ts`**

```ts
import { readFileSync } from 'node:fs'
import { hookContext } from '../lib/inject.ts'
import { safeSessionContext } from '../lib/router.ts'
import { cleanSessions, parseSessionId } from '../lib/tasks.ts'

const cwd = process.cwd()
let sessionId: string | null = null
try {
  sessionId = parseSessionId(readFileSync(0, 'utf8'))
} catch {
  sessionId = null
}
try {
  cleanSessions(cwd, 7 * 24 * 3600 * 1000)
} catch {
  /* 清理失败不阻塞注入 */
}
const context = safeSessionContext(cwd, process.env.CLAUDE_PLUGIN_ROOT, sessionId)
process.stdout.write(hookContext('SessionStart', context))
```

- [ ] **Step 2: 重写 `src/hooks/user-prompt-submit.ts`**

```ts
import { readFileSync } from 'node:fs'
import { hookContext } from '../lib/inject.ts'
import { safeTurnReminder } from '../lib/router.ts'
import { parseSessionId } from '../lib/tasks.ts'

let sessionId: string | null = null
try {
  sessionId = parseSessionId(readFileSync(0, 'utf8'))
} catch {
  sessionId = null
}
const context = safeTurnReminder(process.cwd(), sessionId)
process.stdout.write(hookContext('UserPromptSubmit', context))
```

- [ ] **Step 3: 测试、typecheck、构建**

Run: `npm test && npm run typecheck && npm run build`
Expected: 全绿；dist/hooks/*.js 重建

- [ ] **Step 4: 管道验证（模拟 CC 调用，含 session_id）**

Run:
```bash
mkdir -p .claude/skills/_router && printf '# Router v2' > .claude/skills/_router/router.md
echo '{"session_id":"test-s1","prompt":"继续"}' | node dist/hooks/session-start.js
echo '{"session_id":"test-s1","prompt":"继续"}' | node dist/hooks/user-prompt-submit.js
```
Expected: 两条均输出合法 JSON；内容含 `<FLOWNEO_TASKS>` 与「未绑定任务」（此时无任务无绑定）

Run:
```bash
mkdir -p .flow-neo/tasks/demo && printf 'task: 演示\nslug: demo\nstage: 2\n' > .flow-neo/tasks/demo/status.md
mkdir -p .flow-neo/sessions && printf 'task: demo\n' > .flow-neo/sessions/test-s1.md
echo '{"session_id":"test-s1"}' | node dist/hooks/user-prompt-submit.js
```
Expected: 提醒含「完整任务 demo（演示），当前阶段 2」

- [ ] **Step 5: 清理残留并提交**

```bash
rm -rf .claude .flow-neo
git add src/hooks/ dist/
git commit -m "feat: hooks 读取 session_id——会话绑定感知注入与过期清理"
```

---

### Task 4: Router 话术切换到多任务模型

**Files:**
- Modify: `skills/_router/router.md`（整体重写）

**Interfaces:**
- Produces: Router v2 全文（hook 注入内容源；技能名引用不变）

- [ ] **Step 1: 重写 `skills/_router/router.md` 为以下全文**

````markdown
<SUBAGENT-STOP>
如果你是被派发执行具体任务的子代理，忽略本 Router，直接完成你的任务。
</SUBAGENT-STOP>

# FlowNeo 工程工作流调度核心（Router）

你在 FlowNeo 工程工作流约束下工作。接到用户需求先判定分流；涉及既有任务时先读 .flow-neo/tasks/ 与本会话绑定（.flow-neo/sessions/）再行动。

## 任务分流（每个需求判定一次）

- **轻量**：改 Bug、改配置、补注释、局部微调（影响 ≤2 个文件、无设计变更）→ 直接编码 → 简易自查 → 交付。**不建目录、不写任何文件**。
- **复杂（重任务）**：新功能、模块重构、数据表/接口设计、多文件变更 → 必须先有 .flow-neo/tasks/<slug>/ 任务目录并绑定本会话，再走五阶段。
- 用户说「走轻量/完整流程」时立即切换。

## 多任务规则

- 重任务互相独立：各占 .flow-neo/tasks/<slug>/ 一套工件，一次只推进本会话绑定的任务
- 「新任务 <名称>」：由阶段 1 技能创建任务目录并绑定本会话
- 「继续/切换到 <名称或slug>」：匹配 tasks/ 下任务，更新本会话绑定文件后从其断点续作
- 「任务列表」：逐行输出各任务 task + stage
- 未绑定却动重活 = 违规：先新建或绑定任务

## 五阶段（每任务独立串行，禁止跳阶段）

| 阶段 | 调用技能（Skill 工具） | 产出工件（.flow-neo/tasks/<slug>/） |
|---|---|---|
| 1 需求探索 | flowneo-need-explore | 01-need-explore.md（步骤 1 负责建任务+绑定） |
| 2 方案设计 | flowneo-design-plan | 02-design-plan.md |
| 3 编码执行 | flowneo-task-execute | 03-task-record.md |
| 4 代码审查 | flowneo-code-review | 04-code-review.md |
| 5 交付归档 | flowneo-git-archive | 05-archive-summary.md → history/ |

## 流转纪律（硬约束）

1. 本任务上一阶段工件未落盘，禁止进入下一阶段
2. 每次阶段变更同步更新本任务 status.md（task/slug/stage/artifacts/updated 五字段）
3. 编码严格依据本任务 02-design-plan.md，禁止自由发挥；设计未覆盖先补设计再编码
4. 工件仅写入本任务目录，文件名固定禁止改名，不预建空文件
5. 任务交付由阶段 5 迁移至 .flow-neo/history/<YYYYMMDD>-<slug>/ 并清理引用它的会话绑定，绝不覆盖历史

## Red Flags——出现以下念头立即停下（它们是合理化借口，不是理由）

| 念头 | 现实 |
|---|---|
| 「需求很清楚，不用做需求探索」 | 清楚是错觉；至少要落边界与验收标准 |
| 「先动手，任务目录回头再建」 | 重活必须先建任务+绑定，无例外 |
| 「设计文档可以编码后再补」 | 禁止；02 是编码唯一依据，先设计后编码 |
| 「顺手把另一个任务的事也做了」 | 切换任务先改绑定，不混做 |
| 「先跳过审查，用户等着要」 | 审查是交付前提，缩报告可以、跳审查不行 |
| 「这个文件另一任务也在改，没关系」 | 并行任务涉及文件重叠时，动工前必须先向用户确认 |

## 上下文纪律

- 超长文件/日志/Diff 只保留结论与关键片段（各 ≤50 行），禁止整段复读工具输出
- 会话恢复凭本会话绑定与本任务 status.md/工件断点续作，不重跑已完成阶段

> 用户显式指令（CLAUDE.md、直接要求）优先级高于本 Router；冲突时服从用户并说明。
````

- [ ] **Step 2: lint 体积验证**

Run: `npm run lint`
Expected: `flowneo lint 通过`（估算约 1250~1400 ≤ 1500；超限先精简 Red Flags 行文字，不减条目）

- [ ] **Step 3: Commit**

```bash
git add skills/_router/router.md
git commit -m "feat: Router 切换多任务模型——绑定规则、并行 Red Flags、tasks 路径"
```

---

### Task 5: 技能 01+02 话术切换（含任务创建）

**Files:**
- Modify: `skills/01-need-explore/SKILL.md`（整体重写）
- Modify: `skills/02-design-plan/SKILL.md`（路径与 HARD-GATE 更新）

**Interfaces:**
- Consumes: Router v2 的 slug 规则（冲突 -2 递增）与绑定机制
- Produces: frontmatter name 不变（flowneo-need-explore / flowneo-design-plan）

- [ ] **Step 1: 重写 `skills/01-need-explore/SKILL.md` 为以下全文**

````markdown
---
name: flowneo-need-explore
description: FlowNeo 阶段一·需求探索与任务创建。当判定为重任务且尚无对应任务目录时使用。创建 .flow-neo/tasks/<slug>/ 任务、绑定会话、澄清需求，产出 01-need-explore.md 并推进到阶段 2。
---

# 阶段一：需求探索（含任务创建）

目标：创建任务、澄清模糊需求、锁定需求边界、排除无效诉求，杜绝开发中途改需求、漏需求。

## 执行步骤

1. **创建任务**（已存在本会话绑定的任务则跳过本步，直接从步骤 2 开始）：
   - 与用户确认任务名；slug 优先用任务的英文短横线名（如 user-center），用户未提供则由任务名清洗生成（空格/斜杠→`-`；与 .flow-neo/tasks/ 既有目录冲突时追加 -2、-3）
   - 创建 `.flow-neo/tasks/<slug>/status.md`：`task: <任务名>`、`slug: <slug>`、`stage: 1`、`artifacts: []`、`updated: <当前时间>` 五字段
   - 写本会话绑定 `.flow-neo/sessions/<本会话id>.md`：`task: <slug>`（无法获知会话 id 的环境跳过此步）
2. 拆解用户原始需求，提炼核心开发目标
3. 逐项明确：需求边界与不做事项、运行环境与兼容要求、验收标准
4. 存在模糊点时一次性列出全部疑问向用户确认（禁止拆成多轮）；无法确认的给出假设并显式标注
5. 按下方模板写入 `.flow-neo/tasks/<slug>/01-need-explore.md`
6. 更新本任务 status.md：stage: 2，artifacts 追加 01-need-explore.md
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
````

- [ ] **Step 2: 更新 `skills/02-design-plan/SKILL.md`（两处路径 + HARD-GATE）**

将正文中所有 `.flow-neo/current/` 替换为 `.flow-neo/tasks/<本任务slug>/`（出现位置：description 无、执行步骤 1/3、模板标题下无、HARD-GATE 内）。HARD-GATE 新文本：

```markdown
<HARD-GATE>
本任务 02-design-plan.md 四段未齐全、且未经用户确认（或标注假设）前，禁止创建/修改任何业务代码文件。
</HARD-GATE>
```

（正文其余结构与 v0.1.0 版一致，仅「执行步骤 1」中的读取路径改为：读取本任务 `01-need-explore.md`）

- [ ] **Step 3: lint 验证**

Run: `npm run lint`
Expected: `flowneo lint 通过`

- [ ] **Step 4: Commit**

```bash
git add skills/01-need-explore skills/02-design-plan
git commit -m "feat: 技能 01 任务创建+绑定、02 切换 tasks 路径"
```

---

### Task 6: 技能 03+04+05 话术切换（05 含绑定清理）

**Files:**
- Modify: `skills/03-task-execute/SKILL.md`、`skills/04-code-review/SKILL.md`（路径替换）
- Modify: `skills/05-git-archive/SKILL.md`（整体重写）

**Interfaces:**
- Consumes: 本任务 slug（来自 status.md）

- [ ] **Step 1: 更新 03/04**

03：正文中所有 `.flow-neo/current/` → `.flow-neo/tasks/<本任务slug>/`；HARD-GATE 内路径同步（`02-design-plan.md` → `本任务 02-design-plan.md`）；「四、任务拆解」引用改为「本任务 02-design-plan.md 的『四、任务拆解』」。
04：同样路径替换；「02-design-plan.md 逐条比对」改为「本任务 02-design-plan.md 逐条比对」。

- [ ] **Step 2: 重写 `skills/05-git-archive/SKILL.md` 为以下全文**

````markdown
---
name: flowneo-git-archive
description: FlowNeo 阶段五·交付归档。当本任务 status.md 的 stage 为 5 时使用。产出 05-archive-summary.md，将本任务目录迁移至 .flow-neo/history/<YYYYMMDD>-<slug>/ 快照，清理会话绑定并重建空任务位。
---

# 阶段五：交付归档

目标：汇总交付成果、沉淀复盘、形成版本快照，绝不覆盖历史，不影响其他进行中任务。

## 执行步骤

1. 按模板写入本任务目录的 05-archive-summary.md
2. 若项目使用 git：按项目提交规范提交代码变更（.flow-neo/ 是否入库遵循项目 .gitignore）
3. 归档迁移：`mkdir -p .flow-neo/history && mv .flow-neo/tasks/<slug> .flow-neo/history/<YYYYMMDD>-<slug>/`（若目标目录已存在，在 slug 末尾追加 -2、-3 递增后缀后重试，绝不覆盖已有快照）
4. 清理绑定：删除 .flow-neo/sessions/ 下所有内容为 `task: <slug>` 的绑定文件
5. 向用户汇报交付总结与归档路径；本会话后续需求按新任务重新分流

## 05-archive-summary.md 模板

# 交付归档：<任务名>

## 功能总结
## 变更文件清单
## 核心实现复盘
## 遗留问题与迭代建议
## 工件索引
- 本任务 01~05 全部工件路径

## 完成条件

history/ 下快照完整（01~05 + status.md）；引用绑定已清理；其他 tasks/ 任务未受影响；用户已收到交付汇报。
````

- [ ] **Step 3: lint 全量验证**

Run: `npm run lint`
Expected: `flowneo lint 通过`

- [ ] **Step 4: Commit**

```bash
git add skills/03-task-execute skills/04-code-review skills/05-git-archive
git commit -m "feat: 技能 03/04/05 切换多任务路径，05 增加绑定清理"
```

---

### Task 7: 版本 0.2.0 + 方案文档 v2.2 + 真机验收

**Files:**
- Modify: `package.json`、`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`（version 0.1.0 → 0.2.0）
- Modify: `docs/FlowNeo 跨平台AI编码插件完整技术方案（Claude Code _ Codex 通用、Superpowers精简增强版）.md`

**Interfaces:**
- Consumes: 全部前序任务产物

- [ ] **Step 1: 三处版本号 0.1.0 → 0.2.0**

`package.json` 第 3 行 `"version": "0.2.0"`；两个清单 JSON 的 `"version": "0.2.0"`。

- [ ] **Step 2: 技术方案文档升 v2.2**

在修订记录追加：
```markdown
> - v2.2（2026-08-27）：多任务并行支持——`.flow-neo/tasks/<slug>/` 取代 `current/` 单活跃区；新增会话级绑定 `sessions/<session-id>.md`（CC 机制级多会话隔离）；轻任务零文件化；status.md 去 mode 增 slug；Router/技能话术全链路切换。
```
并做以下替换（逐处定位）：
1. 「### 3. 状态文件 status.md」小节：路径改 `.flow-neo/tasks/<slug>/status.md`，字段表改 `task / slug / stage / artifacts / updated`，标题下补一句「每个任务独立一份，配合 `.flow-neo/sessions/<session-id>.md` 会话绑定实现多任务并行」
2. 「### 3. 运行时工件目录（双端一致）」代码块整体替换为：
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
3. 「任务生命周期流转」小节：「新任务启动」改为「01 技能创建 tasks/<slug>/ 并绑定会话；轻任务零文件」；「任务收尾」改为「05 迁移至 history/ 并清理绑定」
4. 其余正文中出现的 `.flow-neo/current`（第五节仓库结构注释、六-1 工件表路径）统一改为 `.flow-neo/tasks/<slug>`

- [ ] **Step 3: 全量自检**

Run: `npm test && npm run typecheck && npm run lint && npm run verify`
Expected: 全部通过（dist 与 src 同步）

- [ ] **Step 4: 更新本地安装的插件**

Run:
```bash
claude plugin marketplace update flowneo-marketplace 2>/dev/null || claude plugin marketplace add /Users/huangjian/workspace/cursor/flowNeo
claude plugin install flowneo@flowneo-marketplace --force 2>/dev/null || claude plugin update flowneo 2>/dev/null || echo "手动重装: 先 remove 再 install"
claude plugin list | grep -A 3 flowneo
```
Expected: 版本显示 0.2.0 enabled（命令名以本机 CLI 实际支持为准，失败则 remove 后重装）

- [ ] **Step 5: 真机多任务验收（claude -p 自动化部分）**

在 `/tmp/flowneo-mt` 建空 git 仓库作为试验场（避免污染主仓库）：
```bash
rm -rf /tmp/flowneo-mt && mkdir -p /tmp/flowneo-mt && cd /tmp/flowneo-mt && git init -q
cd /tmp/flowneo-mt && claude -p '新任务：给这个仓库加一个 hello.sh 输出问候。请只完成阶段1的需求探索，产出工件后停下告诉我阶段1完成' --dangerously-skip-permissions --max-turns 6 --output-format stream-json --verbose 2>/dev/null | grep -c '01-need-explore\|status.md' 
ls .flow-neo/tasks/ && cat .flow-neo/tasks/*/status.md | head -6
ls .flow-neo/sessions/ | head -3
cd /tmp/flowneo-mt && claude -p '任务列表' --max-turns 2 2>/dev/null | tail -5
```
Expected: tasks/ 出现一个任务目录且 status.md stage 为 1~2；sessions/ 出现绑定文件；第二个会话能列出任务

- [ ] **Step 6: 人工验收清单（交用户，无法自动化）**

1. 交互会话 A：新任务做到阶段 2 → 开交互会话 B 新建另一任务 → 两会话各自每轮提醒始终是自己的任务（互不干扰）
2. 会话 A 说「切换到 <B的任务>」再「切回」：断点续作正确
3. 轻任务全程零文件
4. 一个任务走完归档：history 快照 + 绑定清理 + 另一任务不受影响

- [ ] **Step 7: 收尾提交**

```bash
git add package.json .claude-plugin/ docs/
git commit -m "chore: v0.2.0 版本同步与方案文档 v2.2（多任务并行）"
npm run verify
```

---

## Self-Review 记录

- **Spec 覆盖**：spec §3 目录模型→Task 1/2；§4 生命周期→Task 1（makeSlug/writeBinding）+ Task 5（01 创建）+ Task 6（05 清理）；§5 注入链路→Task 2/3（含 stdin 容错、7 天清理、≤5 截断）；§6 技能改动→Task 5/6；§7 边界→Router Red Flags（Task 4）+ lint 体积 + 版本三处（Task 7）+ 文档 v2.2（Task 7）；§8 测试→各 task TDD + Task 7 真机。无遗漏。
- **占位符**：Task 5 Step 2 / Task 6 Step 1 的「路径替换」类步骤给出了精确的替换规则与锚点文本；Task 3 Step 1 中废弃的首次试读方案已用「最终采用」显式消歧。无 TBD。
- **类型一致性**：`makeSlug(name, existing)`、`readBinding(cwd, sessionId)`、`writeBinding(cwd, sessionId, slug)`、`listTasks(cwd)`、`cleanSessions(cwd, maxAgeMs)`、`parseSessionId(input)`、`readStatus(cwd, slug)`、`buildSessionContext(cwd, pluginRoot, sessionId)`、`buildTurnReminder(cwd, sessionId)`、`safeSessionContext(cwd, pluginRoot, sessionId)`、`safeTurnReminder(cwd, sessionId)` 在 Task 1/2/3 间签名一致。
