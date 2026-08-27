import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { listTasks, readBinding } from './tasks.ts'

export interface TaskStatus {
  task: string
  slug: string
  stage: string
  raw: string
}

export function routerPath(cwd: string, pluginRoot?: string): string | null {
  const candidates = pluginRoot
    ? [join(pluginRoot, 'skills/_router/router.md'), join(cwd, '.claude/skills/_router/router.md')]
    : [join(cwd, '.claude/skills/_router/router.md')]
  return candidates.find((p) => existsSync(p)) ?? null
}

export function readStatus(cwd: string, slug: string): TaskStatus | null {
  const file = join(cwd, '.flow-neo/tasks', slug, 'status.md')
  if (!existsSync(file)) return null
  const raw = readFileSync(file, 'utf8')
  const pick = (key: string) => raw.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? ''
  return { task: pick('task'), slug: pick('slug'), stage: pick('stage'), raw }
}

function formatTaskList(cwd: string): string {
  const tasks = listTasks(cwd)
  if (tasks.length === 0) return '无进行中任务'
  return tasks.map((t) => `${t.slug}（阶段 ${t.stage || '?'}）`).join('、')
}

function formatOtherTasks(cwd: string, exceptSlug: string): string {
  const others = listTasks(cwd).filter((t) => t.slug !== exceptSlug)
  if (others.length === 0) return ''
  const MAX = 5
  const shown = others.slice(0, MAX).map((t) => `${t.slug}（阶段 ${t.stage || '?'}）`).join('、')
  return others.length > MAX ? `${shown}…及 ${others.length - MAX} 个` : shown
}

export function buildSessionContext(cwd: string, pluginRoot: string | undefined, sessionId: string | null): string {
  const rp = routerPath(cwd, pluginRoot)
  const router = rp ? readFileSync(rp, 'utf8') : ''
  const head = `<FLOWNEO_ROUTER>\n${router}\n</FLOWNEO_ROUTER>`
  const slug = sessionId ? readBinding(cwd, sessionId) : null
  if (slug) {
    const status = readStatus(cwd, slug)
    if (status) return `${head}\n\n<FLOWNEO_STATUS>\n${status.raw}\n</FLOWNEO_STATUS>`
  }
  return `${head}\n\n<FLOWNEO_TASKS>\n${formatTaskList(cwd)}\n</FLOWNEO_TASKS>`
}

export function buildTurnReminder(cwd: string, sessionId: string | null): string {
  const slug = sessionId ? readBinding(cwd, sessionId) : null
  const status = slug ? readStatus(cwd, slug) : null
  if (status) {
    const others = formatOtherTasks(cwd, status.slug)
    const otherPart = others ? `其他任务：${others}。` : ''
    return `【FlowNeo】完整任务 ${status.slug}（${status.task || '未命名'}），当前阶段 ${status.stage || '?'}：遵守该阶段纪律，产出/更新对应工件后先更新 status.md 再进入下一阶段。${otherPart}`
  }
  const tasks = formatTaskList(cwd)
  const taskPart = tasks === '无进行中任务' ? '' : `进行中任务：${tasks}。`
  return `【FlowNeo】本会话未绑定任务：重任务→说「新任务 <名称>」创建并绑定；继续既有→说「继续 <名称或slug>」；轻任务→直接做，不留任何文件。${taskPart}`
}

export function safeSessionContext(cwd: string, pluginRoot: string | undefined, sessionId: string | null): string {
  try {
    return buildSessionContext(cwd, pluginRoot, sessionId)
  } catch {
    return ''
  }
}

export function safeTurnReminder(cwd: string, sessionId: string | null): string {
  try {
    return buildTurnReminder(cwd, sessionId)
  } catch {
    return ''
  }
}
