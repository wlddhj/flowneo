import { describe, expect, it, beforeEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { lintAll, lintAgentsSync } from '../src/lib/lint.ts'

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

describe('lintAgentsSync（AGENTS-flowneo.md 与 router.md 同步）', () => {
  it('AGENTS 与 router 同步时 lint 该项通过', () => {
    const router = '# Router\n\n## 配置开关\n\n- demo 开关\n'
    put('_router/router.md', router)
    put('AGENTS-flowneo.md', `<!-- FLOWNEO:BEGIN -->\n${router}<!-- FLOWNEO:END -->\n`)
    expect(lintAgentsSync(join(dir, 'AGENTS-flowneo.md'), join(dir, '_router/router.md'))).toEqual([])
    // 经 lintAll 第二参数接入后全量亦通过
    expect(lintAll(dir, join(dir, 'AGENTS-flowneo.md'))).toEqual([])
  })
  it('AGENTS 某行被改动后报不同步错误', () => {
    put('_router/router.md', '# Router\n\n## 配置开关\n\n- demo 开关\n')
    put(
      'AGENTS-flowneo.md',
      '<!-- FLOWNEO:BEGIN -->\n# Router\n\n## 配置开关\n\n- 被人为改动的行\n<!-- FLOWNEO:END -->\n',
    )
    const errors = lintAll(dir, join(dir, 'AGENTS-flowneo.md'))
    expect(errors).toEqual(['AGENTS-flowneo.md 与 router.md 不同步（Codex 端话术漂移）'])
  })
})
