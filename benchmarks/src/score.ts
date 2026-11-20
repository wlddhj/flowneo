import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { BenchTask, CellCheckResult } from './types.ts'

const SKIP_DIRS = new Set(['.git', 'node_modules', '.flow-neo'])

function walk(dir: string, rel = '', out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const relPath = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) walk(join(dir, entry.name), relPath, out)
    else out.push(relPath)
  }
  return out
}

// 最小 glob：支持 '<star><star>/<star>.<ext>' 与 '<star><star>/<star>'（种子工作区自包含，无需完整 glob 引擎）
function globMatch(glob: string, path: string): boolean {
  if (glob === '**/*') return true
  const m = glob.match(/^\*\*\/\*(\.\S+)$/)
  if (m) return path.endsWith(m[1])
  return glob === path
}

/** 执行隐藏检查点：grep 型检索工作区，test 型在 workdir 跑命令（exit 0 = 命中） */
export function runChecks(task: BenchTask, workdir: string): CellCheckResult[] {
  return task.hiddenChecks.map((check) => {
    try {
      if (check.kind === 'grep' && check.grep) {
        const { pattern, glob } = check.grep
        const re = new RegExp(pattern)
        const hit = walk(workdir).some((rel) => {
          if (!globMatch(glob, rel)) return false
          return re.test(readFileSync(join(workdir, rel), 'utf8'))
        })
        return { id: check.id, pass: hit }
      }
      if (check.kind === 'test' && check.test) {
        execFileSync(check.test, { cwd: workdir, shell: '/bin/bash', stdio: 'pipe', timeout: 30_000 })
        return { id: check.id, pass: true }
      }
      return { id: check.id, pass: false }
    } catch {
      return { id: check.id, pass: false }
    }
  })
}

/** .flow-neo 工件完备数：01~05 + status.md（0-6）。归档后在 history/，未归档在 tasks/，取最大值 */
export function countArtifacts(workdir: string): number {
  const roots = [join(workdir, '.flow-neo', 'tasks'), join(workdir, '.flow-neo', 'history')]
  let max = 0
  for (const root of roots) {
    if (!existsSync(root)) continue
    for (const slug of readdirSync(root)) {
      const dir = join(root, slug)
      if (!statSync(dir).isDirectory()) continue
      const files = readdirSync(dir)
      const count =
        ['01-need-explore.md', '02-design-plan.md', '03-task-record.md', '04-code-review.md', '05-archive-summary.md', 'status.md'].filter((f) =>
          files.includes(f),
        ).length
      max = Math.max(max, count)
    }
  }
  return max
}

const TEST_PATH_RE = /(^|\/)(tests?|__tests?__)(\/|$)|[._-](test|spec)\.|\.test\.|\.spec\./

/** 产出 LOC 统计：diff vs 种子 commit；.flow-neo 工件不计，测试文件单列 */
export function locStats(workdir: string, seedSha: string): { srcLoc: number; testLoc: number } {
  const git = (args: string[]) =>
    execFileSync('git', ['-C', workdir, ...args], { encoding: 'utf8' })
  git(['add', '-A'])
  let srcLoc = 0
  let testLoc = 0
  const diff = git(['diff', '--cached', '--numstat', seedSha])
  for (const line of diff.trim().split('\n')) {
    if (!line) continue
    const [add, del, ...pathParts] = line.split('\t')
    if (add === '-') continue // 二进制
    const path = pathParts.join('\t')
    if (path.startsWith('.flow-neo/')) continue
    const delta = Number(add) + Number(del)
    if (TEST_PATH_RE.test(path)) testLoc += delta
    else srcLoc += delta
  }
  return { srcLoc, testLoc }
}
