import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MARK_BEGIN = '<!-- FLOWNEO:BEGIN -->'
const MARK_END = '<!-- FLOWNEO:END -->'

/** FlowNeo 技能目录清单（卸载时只删这些，不动用户自有技能） */
const FLOWNEO_SKILL_DIRS = [
  '_router',
  '01-need-explore',
  '02-design-plan',
  '03-task-execute',
  '04-code-review',
  '05-git-archive',
]

/** FlowNeo hooks 事件清单（settings.json 注销时遍历） */
const FLOWNEO_HOOK_EVENTS = ['SessionStart', 'UserPromptSubmit', 'PostToolUse'] as const

/** FlowNeo 三事件的 hook 命令模板（数组级合并/幂等判重依据） */
const FLOWNEO_HOOK_CMDS: Record<string, string> = {
  SessionStart: 'node .claude/flowneo/hooks/session-start.js',
  UserPromptSubmit: 'node .claude/flowneo/hooks/user-prompt-submit.js',
  PostToolUse: 'node .claude/flowneo/hooks/post-tool-use.js',
}

export interface InitOpts {
  target: 'claude' | 'codex' | 'all'
  scope: 'project' | 'user'
}

/** 复制技能内核到目标端目录 */
export function copySkills(cwd: string, pluginRoot: string, target: 'claude' | 'codex'): void {
  const dest = target === 'claude' ? join(cwd, '.claude/skills') : join(cwd, '.codex/skills')
  cpSync(join(pluginRoot, 'skills'), dest, { recursive: true })
}

/** 复制 dist hooks 到项目内（仅 claude 端） */
export function copyHooks(cwd: string, pluginRoot: string): void {
  cpSync(join(pluginRoot, 'dist/hooks'), join(cwd, '.claude/flowneo/hooks'), { recursive: true })
}

/** 合并 FlowNeo hooks 到 .claude/settings.json（数组级过滤合并：保留用户同事件 hooks，FlowNeo 项幂等替换不叠加） */
export function mergeHooksSettings(cwd: string): void {
  const file = join(cwd, '.claude/settings.json')
  let settings: Record<string, unknown> = {}
  if (existsSync(file)) {
    try {
      settings = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      settings = {}
    }
  }
  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>
  for (const ev of FLOWNEO_HOOK_EVENTS) {
    const entries = Array.isArray(hooks[ev]) ? hooks[ev] : []
    // 幂等判重：剔除既有 FlowNeo 项后追加单项，重复 init 不叠加、用户同事件项保留
    const kept = entries.filter((e) => !JSON.stringify(e).includes('.claude/flowneo/hooks/'))
    hooks[ev] = [...kept, { hooks: [{ type: 'command', command: FLOWNEO_HOOK_CMDS[ev], async: false }] }]
  }
  settings.hooks = hooks
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, JSON.stringify(settings, null, 2) + '\n')
}

/** AGENTS.md 标记段：存在则替换，不存在则追加 */
export function updateAgentsMd(cwd: string, pluginRoot: string): void {
  const file = join(cwd, 'AGENTS.md')
  const section = readFileSync(join(pluginRoot, 'AGENTS-flowneo.md'), 'utf8').trimEnd()
  let current = ''
  if (existsSync(file)) current = readFileSync(file, 'utf8')
  if (current.includes(MARK_BEGIN) && current.includes(MARK_END)) {
    // g flag：标记段多次出现时全替换（与 removeAgentsSection 对称）
    const re = new RegExp(`${MARK_BEGIN}[\\s\\S]*?${MARK_END}`, 'g')
    current = current.replace(re, section)
    // 替换分支保留文件自身尾部换行，避免反复 init 时尾部空行逐次增长
    writeFileSync(file, current.endsWith('\n') ? current : `${current}\n`)
    return
  }
  current = current.trimEnd().length === 0 ? section : `${current.trimEnd()}\n\n${section}`
  writeFileSync(file, `${current}\n`)
}

/** AGENTS.md 标记段移除（保留用户自有内容） */
export function removeAgentsSection(cwd: string): boolean {
  const file = join(cwd, 'AGENTS.md')
  if (!existsSync(file)) return false
  const current = readFileSync(file, 'utf8')
  if (!current.includes(MARK_BEGIN)) return false
  const re = new RegExp(`\\n*${MARK_BEGIN}[\\s\\S]*?${MARK_END}\\n*`, 'g')
  writeFileSync(file, current.replace(re, '\n').trim() + '\n')
  return true
}

/** settings.json 注销 FlowNeo hooks（保留用户其他 hooks） */
export function removeHooksSettings(cwd: string): void {
  const file = join(cwd, '.claude/settings.json')
  if (!existsSync(file)) return
  let settings: Record<string, unknown>
  try {
    settings = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return
  }
  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>
  for (const ev of FLOWNEO_HOOK_EVENTS) {
    const entries = hooks[ev]
    if (!Array.isArray(entries)) continue
    const kept = entries.filter((e) => {
      const cmd = JSON.stringify(e)
      return !cmd.includes('.claude/flowneo/hooks/')
    })
    if (kept.length === 0) delete hooks[ev]
    else hooks[ev] = kept
  }
  settings.hooks = hooks
  writeFileSync(file, JSON.stringify(settings, null, 2) + '\n')
}

/** 初始化 .flow-neo/config/（从模板复制，已存在则跳过） */
export function ensureFlowNeoConfig(cwd: string, pluginRoot: string): void {
  const dest = join(cwd, '.flow-neo/config/plugin.config.json')
  if (existsSync(dest)) return
  mkdirSync(join(dest, '..'), { recursive: true })
  cpSync(join(pluginRoot, 'config/plugin.config.json'), dest)
}

export function init(opts: InitOpts, cwd: string, pluginRoot: string): string[] {
  const done: string[] = []
  const targets = opts.target === 'all' ? (['claude', 'codex'] as const) : [opts.target]
  for (const t of targets) {
    copySkills(cwd, pluginRoot, t)
    done.push(`${t} skills`)
    if (t === 'claude') {
      copyHooks(cwd, pluginRoot)
      mergeHooksSettings(cwd)
      done.push('claude hooks + settings')
    } else {
      updateAgentsMd(cwd, pluginRoot)
      done.push('codex AGENTS.md 标记段')
    }
  }
  ensureFlowNeoConfig(cwd, pluginRoot)
  done.push('.flow-neo/config')
  return done
}

export function remove(opts: InitOpts, cwd: string): string[] {
  const done: string[] = []
  const targets = opts.target === 'all' ? (['claude', 'codex'] as const) : [opts.target]
  for (const t of targets) {
    const skillsDir = t === 'claude' ? join(cwd, '.claude/skills') : join(cwd, '.codex/skills')
    // 只删 FlowNeo 的技能目录，不动用户自有技能
    for (const d of FLOWNEO_SKILL_DIRS) {
      rmSync(join(skillsDir, d), { recursive: true, force: true })
    }
    done.push(`${t} skills`)
    if (t === 'claude') {
      rmSync(join(cwd, '.claude/flowneo'), { recursive: true, force: true })
      removeHooksSettings(cwd)
      done.push('claude hooks 注销')
    } else if (removeAgentsSection(cwd)) {
      done.push('codex AGENTS.md 标记段移除')
    }
  }
  return done
}
