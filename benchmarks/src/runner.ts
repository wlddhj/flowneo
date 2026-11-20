import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Arm, BenchTask, CellResult } from './types.ts'
import { prepareWorkspace, buildClaudeArgs, buildEnv } from './isolate.ts'
import { parseStream, aggregate, reeditMax, isWaitingConfirm, type StreamStats } from './metrics.ts'
import { runChecks, countArtifacts, locStats } from './score.ts'

export interface RunOpts {
  timeoutMs: number
  maxResume: number
}

interface SegmentOutcome {
  streamText: string
  timedOut: boolean
  exitCode: number | null
  errorMessage?: string
}

/** 跑一段 claude 会话（spawn 进程组，超时树杀），stdout 为流文本 */
function runSegment(args: string[], env: NodeJS.ProcessEnv, timeoutMs: number, cwd: string): Promise<SegmentOutcome> {
  return new Promise((resolve) => {
    const child = spawn('claude', args, { env, cwd, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      try {
        process.kill(-child.pid!, 'SIGKILL')
      } catch {
        child.kill('SIGKILL')
      }
    }, timeoutMs)
    child.stdout.on('data', (c) => (out += c))
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ streamText: out, timedOut, exitCode: null, errorMessage: String(err) })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ streamText: out, timedOut, exitCode: code })
    })
  })
}

const PROMPT_PREFIX = '请在本目录完成以下开发任务：\n\n'

/** 单格执行：仓外隔离工作区（防路径泄露与外层 package.json 污染）→ 会话（停等自动续轮）→ 评分 → 工作区移入 runs/ → result.json */
export async function runCell(
  task: BenchTask,
  arm: Arm,
  runIdx: number,
  cellDir: string,
  opts: RunOpts,
): Promise<CellResult> {
  mkdirSync(cellDir, { recursive: true })
  // 工作区先建在系统 tmp（仓外）：agent 看不到 benchmarks 路径，require 也不受仓库 package.json 波及；跑完移入 runs/
  const workdir = mkdtempSync(join(tmpdir(), 'bench-cell-'))
  const seedSha = prepareWorkspace(task, workdir)
  writeFileSync(join(cellDir, 'meta.json'), JSON.stringify({ task: task.id, arm: arm.id, run: runIdx, seedSha }, null, 2))

  const env = buildEnv()
  const baseArgs = buildClaudeArgs(arm)
  const parts: StreamStats[] = []
  const streams: string[] = []
  let resumeCount = 0
  let prompt = PROMPT_PREFIX + task.brief
  let sessionId: string | null = null
  let timedOut = false
  const deadline = Date.now() + opts.timeoutMs

  try {
    while (true) {
      const args = sessionId
        ? ['-p', '--resume', sessionId, ...baseArgs, prompt]
        : ['-p', ...baseArgs, prompt]
      const remain = deadline - Date.now()
      if (remain <= 0) {
        timedOut = true
        break
      }
      const seg = await runSegment(args, env, remain, workdir)
      streams.push(seg.streamText)
      if (seg.errorMessage) {
        const r = finish(task, arm, runIdx, cellDir, workdir, seedSha, parts, 0, 'error', `claude 启动失败：${seg.errorMessage}`)
        return r
      }
      const stats = parseStream(seg.streamText)
      parts.push(stats)
      sessionId = stats.sessionId ?? sessionId
      if (seg.timedOut) {
        timedOut = true
        break
      }
      const wait = isWaitingConfirm(stats.lastAssistantText, stats.askUserCalled)
      if (wait && resumeCount < opts.maxResume) {
        resumeCount += 1
        prompt = wait === 'archive' ? '迁移至 history' : '确认'
        continue
      }
      break
    }
    return finish(task, arm, runIdx, cellDir, workdir, seedSha, parts, resumeCount, timedOut ? 'timeout' : 'ok')
  } finally {
    streams.forEach((text, i) => writeFileSync(join(cellDir, `stream-${i + 1}.jsonl`), text))
    cpSync(workdir, join(cellDir, 'workspace'), { recursive: true })
    rmSync(workdir, { recursive: true, force: true })
  }
}

function finish(
  task: BenchTask,
  arm: Arm,
  runIdx: number,
  cellDir: string,
  workdir: string,
  seedSha: string,
  parts: StreamStats[],
  resumeCount: number,
  status: CellResult['status'],
  error?: string,
): CellResult {
  const stats = aggregate(parts)
  const checks = status === 'ok' ? runChecks(task, workdir) : []
  const artifacts = status === 'ok' ? countArtifacts(workdir) : 0
  let srcLoc = 0
  let testLoc = 0
  if (status !== 'error') {
    try {
      ;({ srcLoc, testLoc } = locStats(workdir, seedSha))
    } catch {
      // git 不可用时 LOC 记 0，不影响其余指标
    }
  }
  const result: CellResult = {
    task: task.id,
    arm: arm.id,
    run: runIdx,
    status,
    hiddenHits: checks.filter((c) => c.pass).length,
    hiddenTotal: task.hiddenChecks.length,
    checks,
    artifacts,
    turns: stats.turns,
    reeditMax: reeditMax(stats),
    srcLoc,
    testLoc,
    durationMs: stats.durationMs,
    tokensIn: stats.tokensIn,
    tokensOut: stats.tokensOut,
    costUsd: stats.costUsd,
    resumeCount,
    routerSeen: stats.flowneoSeen,
    ...(error ? { error } : {}),
  }
  writeFileSync(join(cellDir, 'result.json'), JSON.stringify(result, null, 2))
  return result
}

/** 简单并行池：逐格取出执行，保持至多 workers 个在飞 */
export async function runPool<T>(items: T[], workers: number, fn: (item: T) => Promise<void>): Promise<void> {
  const inflight = new Set<Promise<void>>()
  const wrap = (p: Promise<void>) => {
    const tracked = p.finally(() => inflight.delete(tracked))
    inflight.add(tracked)
  }
  for (const item of items) {
    while (inflight.size >= workers) await Promise.race(inflight)
    wrap(fn(item))
  }
  await Promise.allSettled(inflight)
}

/** 离线重算：读 meta + stream 文件 + workspace，重跑指标与评分（不调 API）。resumeCount 由流段数恢复（首段之外每段一次续轮） */
export function rescoreCell(task: BenchTask, cellDir: string): CellResult {
  const meta = JSON.parse(readFileSync(join(cellDir, 'meta.json'), 'utf8'))
  const parts: StreamStats[] = []
  for (let i = 1; ; i++) {
    const file = join(cellDir, `stream-${i}.jsonl`)
    try {
      parts.push(parseStream(readFileSync(file, 'utf8')))
    } catch {
      break
    }
  }
  return finish(task, { id: meta.arm }, meta.run, cellDir, join(cellDir, 'workspace'), meta.seedSha, parts, Math.max(0, parts.length - 1), 'ok')
}
