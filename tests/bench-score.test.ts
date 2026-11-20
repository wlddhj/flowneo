import { describe, expect, it, beforeEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runChecks } from '../benchmarks/src/score.ts'
import { REFS } from '../benchmarks/src/refs.ts'
import { TASKS } from '../benchmarks/src/tasks/index.ts'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'flowneo-bench-score-'))
  return () => rmSync(dir, { recursive: true, force: true })
})

function putFiles(files: Record<string, string>) {
  for (const [rel, content] of Object.entries(files)) {
    const file = join(dir, rel)
    mkdirSync(join(file, '..'), { recursive: true })
    writeFileSync(file, content)
  }
}

/** 参照环境 = 种子 + 参照产出（模拟真实格工作区） */
function putRefWithSeed(seed: Record<string, string>, files: Record<string, string>) {
  putFiles({ ...seed, ...files })
}

describe('参照自测（good 必全过 / bad 精确 miss）', () => {
  for (const task of TASKS) {
    const ref = REFS[task.id]
    if (!ref) continue
    it(`${task.id}: good 全过`, async () => {
      putRefWithSeed(task.seed, ref.good)
      const results = runChecks(task, dir)
      const miss = results.filter((r) => !r.pass).map((r) => r.id)
      expect(miss).toEqual([])
    })
    it(`${task.id}: bad 实际 miss 集 === expectedMiss`, async () => {
      putRefWithSeed(task.seed, ref.bad)
      const results = runChecks(task, dir)
      const miss = results.filter((r) => !r.pass).map((r) => r.id).sort()
      expect(miss).toEqual([...ref.expectedMiss].sort())
    })
  }
})

describe('检查点数量门槛（heavy 6~8 / light 2~3，合计 ≥60 为任务 8 后达成）', () => {
  it('先行 3 卡检查点数量在档位区间', () => {
    const heavy = TASKS.filter((t) => t.tier === 'heavy')
    const light = TASKS.filter((t) => t.tier === 'light')
    for (const t of heavy) expect(t.hiddenChecks.length).toBeGreaterThanOrEqual(6)
    for (const t of light) expect(t.hiddenChecks.length).toBeGreaterThanOrEqual(2)
    expect(TASKS.every((t) => REFS[t.id])).toBe(true)
  })
})
