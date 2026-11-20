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

/** 参与 URI 同值校验的 manifest（marketplace.json/package-lock.json 无仓库 URI 字段，仅版本校验覆盖） */
const MANIFEST_URI_FILES = ['package.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json']

interface ManifestLike {
  homepage?: string
  repository?: string | { url?: string }
}

/** URI 字段组：字段名 → 从 manifest 提取归一化前的原始值（repository 兼容字符串与对象两种写法） */
const URI_FIELDS: Array<[string, (m: ManifestLike) => string | undefined]> = [
  ['homepage', (m) => m.homepage],
  ['repository', (m) => (typeof m.repository === 'string' ? m.repository : m.repository?.url)],
]

/** 归一化仓库 URI：剥 git+ 前缀、.git 后缀与尾斜杠；协议与路径参与比对 */
function normalizeRepoUri(uri: string): string {
  return uri.replace(/^git\+/, '').replace(/\.git$/, '').replace(/\/+$/, '')
}

/** 校验各 manifest 仓库 URI（homepage/repository）归一化后组内互相同值，防占位符漏改（617ed77 类事故） */
export function lintManifestUris(root: string): string[] {
  const errors: string[] = []
  const baseline = new Map<string, string>()
  for (const rel of MANIFEST_URI_FILES) {
    const file = join(root, rel)
    if (!existsSync(file)) {
      errors.push(`manifest ${rel} 缺失`)
      continue
    }
    let manifest: ManifestLike
    try {
      manifest = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      errors.push(`manifest ${rel} JSON 解析失败`)
      continue
    }
    let hit = false
    for (const [field, pick] of URI_FIELDS) {
      const raw = pick(manifest)
      if (!raw) continue
      hit = true
      const value = normalizeRepoUri(raw)
      const base = baseline.get(field)
      if (base === undefined) baseline.set(field, value)
      else if (base !== value) {
        errors.push(`manifest URI 漂移：${rel} ${field} 期望 ${base} 实得 ${value}`)
      }
    }
    if (!hit) errors.push(`manifest ${rel} 无任何 URI 字段（homepage/repository 均缺）`)
  }
  return errors
}

export function lintAll(
  skillsDir: string,
  agentsFile?: string,
  routerLimit: number = ROUTER_TOKEN_LIMIT,
): string[] {
  const errors: string[] = []
  const routerFile = join(skillsDir, '_router/router.md')
  if (!existsSync(routerFile)) {
    errors.push(`缺失 ${routerFile}`)
  } else {
    const tokens = estimateTokens(readFileSync(routerFile, 'utf8'))
    if (tokens > routerLimit) {
      errors.push(`router.md 估算 ${tokens} tokens，超限 ${routerLimit}`)
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
