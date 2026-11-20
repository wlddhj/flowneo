import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CellResult } from './types.ts'

interface ArmAgg {
  task: string
  arm: string
  n: number
  hits: number
  total: number
  hitRate: number
  artifactsAvg: number
  turnsAvg: number
  reeditAvg: number
  srcLocAvg: number
  testLocAvg: number
  durationAvgMs: number
  costAvgUsd: number
  tokensOutAvg: number
}

function agg(results: CellResult[]): ArmAgg[] {
  const groups = new Map<string, CellResult[]>()
  for (const r of results) {
    const key = `${r.task}|${r.arm}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }
  return [...groups.entries()].map(([key, rs]) => {
    const [task, arm] = key.split('|')
    const ok = rs.filter((r) => r.status === 'ok')
    const n = ok.length
    const avg = (f: (r: CellResult) => number) => (n ? ok.reduce((s, r) => s + f(r), 0) / n : 0)
    const hits = ok.reduce((s, r) => s + r.hiddenHits, 0)
    const total = n ? ok[0].hiddenTotal : 0
    return {
      task,
      arm,
      n,
      hits,
      total,
      hitRate: total ? hits / (total * n) : 0,
      artifactsAvg: avg((r) => r.artifacts),
      turnsAvg: avg((r) => r.turns),
      reeditAvg: avg((r) => r.reeditMax),
      srcLocAvg: avg((r) => r.srcLoc),
      testLocAvg: avg((r) => r.testLoc),
      durationAvgMs: avg((r) => r.durationMs),
      costAvgUsd: avg((r) => r.costUsd),
      tokensOutAvg: avg((r) => r.tokensOut),
    }
  }).sort((a, b) => (a.task + a.arm).localeCompare(b.task + b.arm))
}

export function summarize(results: CellResult[]) {
  return {
    cells: results.length,
    ok: results.filter((r) => r.status === 'ok').length,
    timeout: results.filter((r) => r.status === 'timeout').length,
    error: results.filter((r) => r.status === 'error').length,
    groups: agg(results),
  }
}

/** 生成 summary.json 与 md 报告（数据表全量；「分析与局限」节由人工补充） */
export function writeReport(stamp: string, results: CellResult[], runsDir: string, outDir: string): string {
  const summary = summarize(results)
  writeFileSync(join(runsDir, 'summary.json'), JSON.stringify(summary, null, 2))
  const lines: string[] = []
  lines.push(`# FlowNeo 基准报告 ${stamp}`, '')
  lines.push('## Setup', '')
  lines.push('- 模型/CLI 版本：<人工补充：claude --version / 实际模型>')
  lines.push(`- 格数：${summary.cells}（ok ${summary.ok} / timeout ${summary.timeout} / error ${summary.error}）`)
  lines.push('- 臂定义：baseline（裸 CC）/ flowneo（--plugin-dir 本仓库）/ verbal（--append-system-prompt 一句话）')
  lines.push('- 隔离：--setting-sources project,local + CLAUDE_CODE_DISABLE_CLAUDE_MDS/AUTO_MEMORY + 每臂 --plugin-dir')
  lines.push('- 停等确认：flowneo 臂检测停等标记自动续轮注入「确认」（上限 3，token 计入该臂）', '')
  lines.push('## 任务 × 臂汇总', '')
  lines.push('| task | arm | n | 漏需求命中 | 工件 | turns | 重编 | srcLoc | testLoc | 时长s | cost$ | tokOut |')
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const g of summary.groups) {
    lines.push(
      `| ${g.task} | ${g.arm} | ${g.n} | ${g.hits}/${g.total * g.n} (${(g.hitRate * 100).toFixed(0)}%) | ${g.artifactsAvg.toFixed(1)} | ${g.turnsAvg.toFixed(1)} | ${g.reeditAvg.toFixed(1)} | ${g.srcLocAvg.toFixed(0)} | ${g.testLocAvg.toFixed(0)} | ${(g.durationAvgMs / 1000).toFixed(0)} | ${g.costAvgUsd.toFixed(3)} | ${g.tokensOutAvg.toFixed(0)} |`,
    )
  }
  lines.push('', '## 逐格数据', '')
  lines.push('| task | arm | run | status | hits | turns | 重编 | srcLoc | testLoc | 时长s | cost$ | 续轮 |')
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const r of results) {
    lines.push(
      `| ${r.task} | ${r.arm} | ${r.run} | ${r.status} | ${r.hiddenHits}/${r.hiddenTotal} | ${r.turns} | ${r.reeditMax} | ${r.srcLoc} | ${r.testLoc} | ${(r.durationMs / 1000).toFixed(0)} | ${r.costUsd.toFixed(3)} | ${r.resumeCount} |`,
    )
  }
  lines.push('', '## 分析与局限', '')
  lines.push('<人工补充：结论、方差观察、方法论局限（本基准设计为可证伪：若 FlowNeo 臂漏需求率未降或成本大增，应如实呈现）>')
  mkdirSync(outDir, { recursive: true })
  const outFile = join(outDir, `${stamp}-bench.md`)
  writeFileSync(outFile, lines.join('\n') + '\n')
  return outFile
}
