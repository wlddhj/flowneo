import { mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import type { Arm, BenchTask } from './types.ts'

/** 隔离环境变量：阻止仓内 CLAUDE.md/AGENTS.md、全局记忆与会话外上下文泄入各臂（ponytail 2026-06-17 基线污染教训） */
export const ISOLATED_ENV = {
  CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1',
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
}

/** 写种子文件 + git init + 种子 commit（产出统计的 diff 基准）。种子无 package.json 时补一份 CJS 默认（防外层 ESM 配置污染 require） */
export function prepareWorkspace(task: BenchTask, workdir: string): string {
  for (const [rel, content] of Object.entries(task.seed)) {
    const file = join(workdir, rel)
    mkdirSync(join(file, '..'), { recursive: true })
    writeFileSync(file, content)
  }
  if (!task.seed['package.json']) {
    writeFileSync(join(workdir, 'package.json'), JSON.stringify({ name: 'bench-seed', private: true }, null, 2) + '\n')
  }
  const git = (args: string[]) =>
    execFileSync('git', ['-C', workdir, ...args], { encoding: 'utf8' })
  git(['init', '-q'])
  git(['add', '-A'])
  git(['-c', 'user.email=bench@flowneo.local', '-c', 'user.name=bench', 'commit', '-q', '-m', 'seed'])
  return git(['rev-parse', 'HEAD']).trim()
}

/** 构造某臂的 claude CLI 固定 flags（不含 -p、prompt 本体与 --resume，由调用方拼接）；model 显式传入时透传 --model */
export function buildClaudeArgs(arm: Arm, model?: string): string[] {
  const args = [
    '--output-format', 'stream-json',
    '--verbose',
    '--setting-sources', 'project,local',
    '--strict-mcp-config',
    '--permission-mode', 'bypassPermissions',
  ]
  if (model) args.push('--model', model)
  if (arm.pluginDir) args.push('--plugin-dir', arm.pluginDir)
  if (arm.appendSystem) args.push('--append-system-prompt', arm.appendSystem)
  return args
}

/** 组合环境（隔离变量 + 继承 PATH 等） */
export function buildEnv(): NodeJS.ProcessEnv {
  return { ...process.env, ...ISOLATED_ENV }
}
