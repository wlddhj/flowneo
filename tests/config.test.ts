import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readConfig, DEFAULT_CONFIG } from '../src/lib/config.ts'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'flowneo-config-'))
})
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
})

describe('readConfig', () => {
  it('无 config 文件返回默认值', () => {
    expect(readConfig(dir)).toEqual(DEFAULT_CONFIG)
  })
  it('部分覆盖与默认值合并', () => {
    mkdirSync(join(dir, '.flow-neo/config'), { recursive: true })
    writeFileSync(join(dir, '.flow-neo/config/plugin.config.json'), JSON.stringify({ reminders: { perTurn: false } }))
    const c = readConfig(dir)
    expect(c.reminders.perTurn).toBe(false)
    expect(c.archive.strategy).toBe('prompt')
    expect(c.lint.routerLimit).toBe(1500)
  })
  it('格式错乱返回默认值', () => {
    mkdirSync(join(dir, '.flow-neo/config'), { recursive: true })
    writeFileSync(join(dir, '.flow-neo/config/plugin.config.json'), 'not json')
    expect(readConfig(dir)).toEqual(DEFAULT_CONFIG)
  })
  it('完整覆盖全部字段', () => {
    mkdirSync(join(dir, '.flow-neo/config'), { recursive: true })
    writeFileSync(join(dir, '.flow-neo/config/plugin.config.json'), JSON.stringify({
      reminders: { perTurn: false },
      archive: { strategy: 'auto' },
      lint: { routerLimit: 2000 },
      schema: { strictness: 'strict' },
      stages: { skipDesign: true, skipReview: true },
    }))
    const c = readConfig(dir)
    expect(c.reminders.perTurn).toBe(false)
    expect(c.archive.strategy).toBe('auto')
    expect(c.lint.routerLimit).toBe(2000)
    expect(c.schema.strictness).toBe('strict')
    expect(c.stages.skipDesign).toBe(true)
    expect(c.stages.skipReview).toBe(true)
  })
})
