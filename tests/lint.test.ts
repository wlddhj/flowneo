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
