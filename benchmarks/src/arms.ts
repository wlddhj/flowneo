import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Arm } from './types.ts'

// 源码态在 benchmarks/src/（回溯两级），打包态在 dist/（回溯一级）——按 .claude-plugin 存在性自适应
const here = fileURLToPath(new URL('.', import.meta.url))
export const repoRoot = existsSync(join(here, '..', '.claude-plugin', 'plugin.json'))
  ? join(here, '..')
  : join(here, '..', '..')

function assertRepoRoot() {
  if (!existsSync(join(repoRoot, '.claude-plugin', 'plugin.json'))) {
    throw new Error(`仓库根定位失败：${repoRoot} 下无 .claude-plugin/plugin.json`)
  }
}

export const ARMS: Record<string, Arm> = {
  baseline: { id: 'baseline' },
  flowneo: {
    id: 'flowneo',
    get pluginDir() {
      assertRepoRoot()
      return repoRoot
    },
  },
  verbal: {
    id: 'verbal',
    appendSystem: '先分析需求并形成设计方案，再编码实现，编码完成后自查审查再交付。',
  },
}
