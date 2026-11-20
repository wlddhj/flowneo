import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ARMS, repoRoot } from './arms.ts'
import { TASKS, findTask } from './tasks/index.ts'
import { REFS } from './refs.ts'
import { runChecks } from './score.ts'
import { buildClaudeArgs, buildEnv, prepareWorkspace } from './isolate.ts'
import { runCell, runPool, rescoreCell } from './runner.ts'
import { writeReport } from './report.ts'
import type { CellResult } from './types.ts'

const RUNS_DIR = join(repoRoot, 'benchmarks', 'runs')
const RESULTS_DIR = join(repoRoot, 'benchmarks', 'results')

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}

function fail(msg: string): never {
  console.error(msg)
  process.exit(1)
}

function selftest(): void {
  let bad = 0
  // 1) 参照自测：good 全过 / bad 精确 miss
  for (const task of TASKS) {
    const ref = REFS[task.id]
    if (!ref) {
      console.error(`缺参照：${task.id}`)
      bad++
      continue
    }
    for (const [kind, files] of [['good', ref.good], ['bad', ref.bad]] as const) {
      const dir = mkdtempSync(join(tmpdir(), `flowneo-selftest-`))
      try {
        // 参照环境 = 种子 + 参照产出（模拟真实格工作区：seed 之上是 agent 的实现）
        for (const [rel, content] of Object.entries({ ...task.seed, ...files })) {
          const file = join(dir, rel)
          mkdirSync(join(file, '..'), { recursive: true })
          writeFileSync(file, content)
        }
        const miss = runChecks(task, dir).filter((r) => !r.pass).map((r) => r.id).sort()
        const expected = kind === 'good' ? [] : [...ref.expectedMiss].sort()
        if (JSON.stringify(miss) !== JSON.stringify(expected)) {
          console.error(`${task.id} ${kind}: 实际 miss ${JSON.stringify(miss)} ≠ 期望 ${JSON.stringify(expected)}`)
          bad++
        }
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    }
  }
  // 2) 检查点门槛
  const totalChecks = TASKS.reduce((s, t) => s + t.hiddenChecks.length, 0)
  for (const t of TASKS.filter((t) => t.tier === 'heavy')) {
    if (t.hiddenChecks.length < 6 || t.hiddenChecks.length > 8) {
      console.error(`${t.id}: heavy 检查点 ${t.hiddenChecks.length} 不在 6~8`)
      bad++
    }
  }
  // 3) 隔离断言：baseline/verbal 无 plugin-dir，flowneo 有；隔离环境变量齐备
  const env = buildEnv()
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS !== '1' || env.CLAUDE_CODE_DISABLE_AUTO_MEMORY !== '1') {
    console.error('隔离环境变量缺失')
    bad++
  }
  if (buildClaudeArgs(ARMS.baseline).includes('--plugin-dir')) {
    console.error('baseline 臂不应有 --plugin-dir')
    bad++
  }
  if (!buildClaudeArgs(ARMS.flowneo).includes('--plugin-dir')) {
    console.error('flowneo 臂缺 --plugin-dir')
    bad++
  }
  if (!buildClaudeArgs(ARMS.verbal).includes('--append-system-prompt')) {
    console.error('verbal 臂缺 --append-system-prompt')
    bad++
  }
  if (bad > 0) fail(`selftest 失败：${bad} 项`)
  console.log(`selftest 通过：${TASKS.length} 任务 / ${totalChecks} 检查点 / 隔离断言全过`)
}

/** 遍历某 stamp 下全部格目录（task/cell 两级，均只取目录，跳过 summary.json 等文件） */
function eachCellDir(stamp: string, cb: (taskId: string, cellDir: string) => void): void {
  const root = join(RUNS_DIR, stamp)
  if (!existsSync(root)) fail(`不存在 ${root}`)
  for (const task of readdirSync(root, { withFileTypes: true })) {
    if (!task.isDirectory()) continue
    for (const cell of readdirSync(join(root, task.name), { withFileTypes: true })) {
      if (!cell.isDirectory()) continue
      cb(task.name, join(root, task.name, cell.name))
    }
  }
}

function loadResults(stamp: string): CellResult[] {
  const results: CellResult[] = []
  eachCellDir(stamp, (taskId, cellDir) => {
    const file = join(cellDir, 'result.json')
    if (existsSync(file)) results.push(JSON.parse(readFileSync(file, 'utf8')))
  })
  return results
}

async function main(): Promise<void> {
  const mode = process.argv[2]
  if (mode === '--selftest') return selftest()
  if (mode === '--dry') {
    const task = findTask(arg('task', '')!)
    const arm = ARMS[arg('arm', 'baseline')!] ?? fail(`未知臂：${arg('arm', 'baseline')}`)
    const model = arg('model')
    const dir = mkdtempSync(join(tmpdir(), 'flowneo-dry-'))
    const seedSha = prepareWorkspace(task, dir)
    console.log('工作区：', dir)
    console.log('seed commit：', seedSha)
    if (model) console.log('--model：', model)
    console.log('将执行：claude', JSON.stringify(['-p', ...buildClaudeArgs(arm, model), '<brief>']).slice(1, -1))
    console.log('brief：', task.brief.slice(0, 80) + '…')
    console.log('（dry 不调 API；工作区保留供检查）')
    return
  }
  if (mode === '--report') {
    const stamp = arg('stamp', '')!
    const out = writeReport(stamp, loadResults(stamp), join(RUNS_DIR, stamp), RESULTS_DIR)
    return console.log('报告已生成：', out)
  }
  if (mode === '--rescore') {
    const stamp = arg('stamp', '')!
    let n = 0
    eachCellDir(stamp, (taskId, cellDir) => {
      rescoreCell(findTask(taskId), cellDir)
      n++
    })
    console.log(`rescore 完成：${n} 格（未调 API）`)
    return
  }
  if (mode === '--run') {
    const stamp = arg('stamp', new Date().toISOString().slice(0, 10))
    const taskIds = (arg('tasks', TASKS.map((t) => t.id).join(',')) ?? '').split(',').filter(Boolean)
    const armIds = (arg('arms', 'baseline,flowneo,verbal') ?? '').split(',').filter(Boolean)
    const runs = Number(arg('runs', '3'))
    const workers = Number(arg('workers', '4'))
    const timeoutMs = Number(arg('timeout-min', '15')) * 60_000
    const model = arg('model')
    const cells: Array<{ taskId: string; armId: string; runIdx: number }> = []
    for (const taskId of taskIds) for (const armId of armIds) for (let i = 1; i <= runs; i++) cells.push({ taskId, armId, runIdx: i })
    console.log(`运行 ${cells.length} 格（workers=${workers}，timeout=${timeoutMs / 60000}min${model ? `，model=${model}` : ''}）→ benchmarks/runs/${stamp}/`)
    let done = 0
    await runPool(cells, workers, async ({ taskId, armId, runIdx }) => {
      const cellDir = join(RUNS_DIR, stamp, taskId, `${armId}-${runIdx}`)
      if (existsSync(join(cellDir, 'result.json'))) {
        done++
        return console.log(`[跳过已存在] ${taskId}/${armId}-${runIdx}`)
      }
      const r = await runCell(findTask(taskId), ARMS[armId], runIdx, cellDir, { timeoutMs, maxResume: 3, model })
      done++
      const rate = r.hiddenTotal ? `${r.hiddenHits}/${r.hiddenTotal}` : '-'
      console.log(`[${done}/${cells.length}] ${taskId}/${armId}-${runIdx} ${r.status} hits=${rate} turns=${r.turns} resume=${r.resumeCount}`)
    })
    const results = loadResults(stamp)
    const out = writeReport(stamp, results, join(RUNS_DIR, stamp), RESULTS_DIR)
    console.log(`完成：ok ${results.filter((r) => r.status === 'ok').length} / 共 ${results.length}，报告：${out}`)
    return
  }
  fail('用法：bench --selftest | --dry --task <id> --arm <id> | --run [--tasks][--arms][--runs][--workers][--timeout-min][--stamp] | --rescore --stamp <s> | --report --stamp <s>')
}

void main()
