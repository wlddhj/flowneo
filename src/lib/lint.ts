import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { estimateTokens } from './tokens.ts'

export const ROUTER_TOKEN_LIMIT = 1500
const NAME_RE = /^flowneo-[a-z0-9-]+$/
const DESC_MIN = 20

/** 校验 AGENTS-flowneo.md（Codex 端 Router 标记段源）与 router.md 逐字同步，防手工副本漂移 */
export function lintAgentsSync(agentsFile: string, routerFile: string): string[] {
  if (!existsSync(agentsFile)) return [`缺失 ${agentsFile}`]
  // router.md 缺失已由 lintAll 单独报错，此处无从比对
  if (!existsSync(routerFile)) return []
  const stripped = readFileSync(agentsFile, 'utf8')
    .trim()
    .replace(/^<!-- FLOWNEO:BEGIN -->/, '')
    .replace(/<!-- FLOWNEO:END -->$/, '')
    .trim()
  if (stripped !== readFileSync(routerFile, 'utf8').trim()) {
    return ['AGENTS-flowneo.md 与 router.md 不同步（Codex 端话术漂移）']
  }
  return []
}

export function lintAll(skillsDir: string, agentsFile?: string): string[] {
  const errors: string[] = []
  const routerFile = join(skillsDir, '_router/router.md')
  if (!existsSync(routerFile)) {
    errors.push(`缺失 ${routerFile}`)
  } else {
    const tokens = estimateTokens(readFileSync(routerFile, 'utf8'))
    if (tokens > ROUTER_TOKEN_LIMIT) {
      errors.push(`router.md 估算 ${tokens} tokens，超限 ${ROUTER_TOKEN_LIMIT}`)
    }
  }
  if (agentsFile) errors.push(...lintAgentsSync(agentsFile, routerFile))
  if (!existsSync(skillsDir)) return errors
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue
    const file = join(skillsDir, entry.name, 'SKILL.md')
    if (!existsSync(file)) {
      errors.push(`${entry.name}/ 缺少 SKILL.md`)
      continue
    }
    const text = readFileSync(file, 'utf8')
    const name = text.match(/^name:\s*(\S+)\s*$/m)?.[1]
    const desc = text.match(/^description:\s*(.+)$/m)?.[1]?.trim()
    if (!name || !NAME_RE.test(name)) {
      errors.push(`${entry.name}: name 无效（需 flowneo- 前缀，小写连字符）`)
    }
    if (!desc || desc.length < DESC_MIN) {
      errors.push(`${entry.name}: description 缺失或少于 ${DESC_MIN} 字符`)
    }
  }
  return errors
}
