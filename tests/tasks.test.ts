import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  makeSlug, readBinding, writeBinding, listTasks, cleanSessions, parseSessionId,
} from '../src/lib/tasks.ts'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'flowneo-tasks-'))
})
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
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
      mkdirSync(join(dir, '.flow-neo/tasks', slug), { recursive: true })
      writeFileSync(join(dir, '.flow-neo/tasks', slug, 'status.md'), `task: ${task}\nslug: ${slug}\nstage: ${stage}\n`)
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
    mkdirSync(join(dir, '.flow-neo/sessions'), { recursive: true })
    const old = join(dir, '.flow-neo/sessions', 'old.md')
    const fresh = join(dir, '.flow-neo/sessions', 'fresh.md')
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
