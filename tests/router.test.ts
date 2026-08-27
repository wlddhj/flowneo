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
