import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface TaskStatus {
  mode: string
  stage: string
  task: string
  raw: string
}

export function routerPath(cwd: string, pluginRoot?: string): string | null {
  const candidates = pluginRoot
    ? [join(pluginRoot, 'skills/_router/router.md'), join(cwd, '.claude/skills/_router/router.md')]
    : [join(cwd, '.claude/skills/_router/router.md')]
  return candidates.find((p) => existsSync(p)) ?? null
}

export function readStatus(cwd: string): TaskStatus | null {
  const file = join(cwd, '.flow-neo/current/status.md')
  if (!existsSync(file)) return null
  const raw = readFileSync(file, 'utf8')
  const pick = (key: string) => raw.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? ''
  return { mode: pick('mode'), stage: pick('stage'), task: pick('task'), raw }
}

export function buildSessionContext(cwd: string, pluginRoot?: string): string {
  const rp = routerPath(cwd, pluginRoot)
  const router = rp ? readFileSync(rp, 'utf8') : ''
  const head = `<FLOWNEO_ROUTER>\n${router}\n</FLOWNEO_ROUTER>`
  const status = readStatus(cwd)
  if (!status) return head
  return `${head}\n\n<FLOWNEO_STATUS>\n${status.raw}\n</FLOWNEO_STATUS>`
}

export function buildTurnReminder(cwd: string): string {
  const s = readStatus(cwd)
  if (!s) {
    return '【FlowNeo】尚无任务状态：判定本任务 light/full 模式并写入 .flow-neo/current/status.md；full 模式按五阶段推进并遵守 Router 纪律。'
  }
  if (s.mode === 'light') {
    return `【FlowNeo】轻量模式（${s.task || '未命名'}）：直接编码 → 简易自查 → 交付，仅 status.md 一行记录，不产生其他工件。`
  }
  return `【FlowNeo】完整模式，当前阶段 ${s.stage || '?'}（${s.task || '未命名'}）：遵守该阶段纪律，产出/更新对应工件后先更新 status.md 再进入下一阶段。`
}

/** hook 入口专用：任何 IO 异常吞掉并返回空串，保证 hook 输出合法 JSON、exit 0 */
export function safeSessionContext(cwd: string, pluginRoot?: string): string {
  try {
    return buildSessionContext(cwd, pluginRoot)
  } catch {
    return ''
  }
}

export function safeTurnReminder(cwd: string): string {
  try {
    return buildTurnReminder(cwd)
  } catch {
    return ''
  }
}
