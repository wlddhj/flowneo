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
