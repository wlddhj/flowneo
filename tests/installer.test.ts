import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  copySkills,
  copyHooks,
  mergeHooksSettings,
  updateAgentsMd,
  removeAgentsSection,
  removeHooksSettings,
  ensureFlowNeoConfig,
  init,
  remove,
} from '../src/lib/installer.ts'

const MARK_BEGIN = '<!-- FLOWNEO:BEGIN -->'
const MARK_END = '<!-- FLOWNEO:END -->'
const SECTION = `${MARK_BEGIN}\nRouter v1 内容\n${MARK_END}`
const SECTION_V2 = `${MARK_BEGIN}\nRouter v2 内容\n${MARK_END}`

let pluginRoot: string
let cwd: string

function makePluginRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'flowneo-plugin-'))
  for (const s of ['_router', '01-need-explore', '02-design-plan', '03-task-execute', '04-code-review', '05-git-archive']) {
    mkdirSync(join(root, `skills/${s}`), { recursive: true })
    writeFileSync(join(root, `skills/${s}/SKILL.md`), `# ${s}`)
  }
  mkdirSync(join(root, 'config'), { recursive: true })
  writeFileSync(join(root, 'config/plugin.config.json'), JSON.stringify({ lint: { routerLimit: 1500 } }))
  mkdirSync(join(root, 'dist/hooks'), { recursive: true })
  for (const h of ['session-start.js', 'user-prompt-submit.js', 'post-tool-use.js']) {
    writeFileSync(join(root, `dist/hooks/${h}`), `console.log('${h}')`)
  }
  writeFileSync(join(root, 'AGENTS-flowneo.md'), SECTION)
  return root
}

beforeEach(() => {
  pluginRoot = makePluginRepo()
  cwd = mkdtempSync(join(tmpdir(), 'flowneo-target-'))
})
afterEach(() => {
  rmSync(pluginRoot, { recursive: true, force: true })
  rmSync(cwd, { recursive: true, force: true })
})

describe('copySkills', () => {
  it('claude 端复制到 .claude/skills', () => {
    copySkills(cwd, pluginRoot, 'claude')
    expect(existsSync(join(cwd, '.claude/skills/_router/SKILL.md'))).toBe(true)
    expect(existsSync(join(cwd, '.claude/skills/05-git-archive/SKILL.md'))).toBe(true)
  })
  it('codex 端复制到 .codex/skills', () => {
    copySkills(cwd, pluginRoot, 'codex')
    expect(existsSync(join(cwd, '.codex/skills/01-need-explore/SKILL.md'))).toBe(true)
    expect(existsSync(join(cwd, '.claude'))).toBe(false)
  })
})

describe('copyHooks', () => {
  it('复制 dist/hooks 到 .claude/flowneo/hooks', () => {
    copyHooks(cwd, pluginRoot)
    expect(existsSync(join(cwd, '.claude/flowneo/hooks/session-start.js'))).toBe(true)
    expect(existsSync(join(cwd, '.claude/flowneo/hooks/post-tool-use.js'))).toBe(true)
  })
})

describe('mergeHooksSettings', () => {
  it('settings.json 不存在时创建并写入三个事件 hooks（相对路径）', () => {
    mergeHooksSettings(cwd)
    const settings = JSON.parse(readFileSync(join(cwd, '.claude/settings.json'), 'utf8'))
    expect(settings.hooks.SessionStart[0].hooks[0].command).toBe('node .claude/flowneo/hooks/session-start.js')
    expect(settings.hooks.UserPromptSubmit[0].hooks[0].command).toBe('node .claude/flowneo/hooks/user-prompt-submit.js')
    expect(settings.hooks.PostToolUse[0].hooks[0].command).toBe('node .claude/flowneo/hooks/post-tool-use.js')
  })
  it('保留用户既有 hooks（非 FlowNeo 事件）与其他顶层字段', () => {
    mkdirSync(join(cwd, '.claude'), { recursive: true })
    writeFileSync(join(cwd, '.claude/settings.json'), JSON.stringify({
      permissions: { allow: ['Bash'] },
      hooks: { PreCompact: [{ hooks: [{ type: 'command', command: 'echo user-hook' }] }] },
    }))
    mergeHooksSettings(cwd)
    const settings = JSON.parse(readFileSync(join(cwd, '.claude/settings.json'), 'utf8'))
    expect(settings.permissions.allow).toEqual(['Bash'])
    expect(settings.hooks.PreCompact[0].hooks[0].command).toBe('echo user-hook')
    expect(settings.hooks.SessionStart).toBeDefined()
  })
  it('重复执行幂等（FlowNeo 项整体替换而非叠加）', () => {
    mergeHooksSettings(cwd)
    mergeHooksSettings(cwd)
    const settings = JSON.parse(readFileSync(join(cwd, '.claude/settings.json'), 'utf8'))
    expect(settings.hooks.SessionStart).toHaveLength(1)
    expect(settings.hooks.PostToolUse).toHaveLength(1)
  })
  it('settings.json 损坏时按空对象重建', () => {
    mkdirSync(join(cwd, '.claude'), { recursive: true })
    writeFileSync(join(cwd, '.claude/settings.json'), 'not json')
    mergeHooksSettings(cwd)
    const settings = JSON.parse(readFileSync(join(cwd, '.claude/settings.json'), 'utf8'))
    expect(settings.hooks.SessionStart).toBeDefined()
  })
})

describe('updateAgentsMd', () => {
  it('AGENTS.md 不存在时写入标记段', () => {
    updateAgentsMd(cwd, pluginRoot)
    const content = readFileSync(join(cwd, 'AGENTS.md'), 'utf8')
    expect(content).toBe(`${SECTION}\n`)
  })
  it('已有用户内容时追加（保留用户内容在前）', () => {
    writeFileSync(join(cwd, 'AGENTS.md'), '# 项目约定\n\n自述内容')
    updateAgentsMd(cwd, pluginRoot)
    const content = readFileSync(join(cwd, 'AGENTS.md'), 'utf8')
    expect(content.startsWith('# 项目约定\n\n自述内容\n\n')).toBe(true)
    expect(content.endsWith(`${SECTION}\n`)).toBe(true)
  })
  it('已存在标记段时原位替换且保留前后用户内容', () => {
    writeFileSync(join(cwd, 'AGENTS.md'), `# 项目约定\n\n${SECTION}\n\n自述内容\n`)
    writeFileSync(join(pluginRoot, 'AGENTS-flowneo.md'), SECTION_V2)
    updateAgentsMd(cwd, pluginRoot)
    const content = readFileSync(join(cwd, 'AGENTS.md'), 'utf8')
    expect(content).toBe(`# 项目约定\n\n${SECTION_V2}\n\n自述内容\n`)
    expect(content).not.toContain('Router v1')
  })
  it('AGENTS.md 为空白文件时直接写入标记段', () => {
    writeFileSync(join(cwd, 'AGENTS.md'), '  \n')
    updateAgentsMd(cwd, pluginRoot)
    const content = readFileSync(join(cwd, 'AGENTS.md'), 'utf8')
    expect(content).toBe(`${SECTION}\n`)
  })
})

describe('removeAgentsSection', () => {
  it('文件不存在返回 false', () => {
    expect(removeAgentsSection(cwd)).toBe(false)
  })
  it('无标记返回 false 且不动文件', () => {
    writeFileSync(join(cwd, 'AGENTS.md'), '# 用户内容\n')
    expect(removeAgentsSection(cwd)).toBe(false)
    expect(readFileSync(join(cwd, 'AGENTS.md'), 'utf8')).toBe('# 用户内容\n')
  })
  it('移除标记段且保留用户内容（段连同两侧空行折叠为单个换行）', () => {
    writeFileSync(join(cwd, 'AGENTS.md'), `# 用户内容\n\n${SECTION}\n\n尾部说明\n`)
    expect(removeAgentsSection(cwd)).toBe(true)
    expect(readFileSync(join(cwd, 'AGENTS.md'), 'utf8')).toBe('# 用户内容\n尾部说明\n')
    expect(readFileSync(join(cwd, 'AGENTS.md'), 'utf8')).not.toContain(MARK_BEGIN)
  })
  it('标记段位于文件开头时结果无前导空行', () => {
    writeFileSync(join(cwd, 'AGENTS.md'), `${SECTION}\n\n# 用户内容\n`)
    expect(removeAgentsSection(cwd)).toBe(true)
    expect(readFileSync(join(cwd, 'AGENTS.md'), 'utf8')).toBe('# 用户内容\n')
  })
  it('文件仅含标记段时清理后近似为空', () => {
    writeFileSync(join(cwd, 'AGENTS.md'), `${SECTION}\n`)
    expect(removeAgentsSection(cwd)).toBe(true)
    expect(readFileSync(join(cwd, 'AGENTS.md'), 'utf8')).toBe('\n')
  })
})

describe('removeHooksSettings', () => {
  it('注销 FlowNeo hooks 且保留用户其他 hooks 与顶层字段', () => {
    mkdirSync(join(cwd, '.claude'), { recursive: true })
    writeFileSync(join(cwd, '.claude/settings.json'), JSON.stringify({
      permissions: { allow: ['Bash'] },
      hooks: {
        SessionStart: [
          { hooks: [{ type: 'command', command: 'node .claude/flowneo/hooks/session-start.js' }] },
          { hooks: [{ type: 'command', command: 'echo user-start' }] },
        ],
        UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'node .claude/flowneo/hooks/user-prompt-submit.js' }] }],
        PreCompact: [{ hooks: [{ type: 'command', command: 'echo keep' }] }],
      },
    }))
    removeHooksSettings(cwd)
    const settings = JSON.parse(readFileSync(join(cwd, '.claude/settings.json'), 'utf8'))
    expect(settings.permissions.allow).toEqual(['Bash'])
    expect(settings.hooks.SessionStart).toHaveLength(1)
    expect(settings.hooks.SessionStart[0].hooks[0].command).toBe('echo user-start')
    expect(settings.hooks.UserPromptSubmit).toBeUndefined()
    expect(settings.hooks.PreCompact).toHaveLength(1)
  })
  it('文件不存在时静默跳过', () => {
    expect(() => removeHooksSettings(cwd)).not.toThrow()
  })
})

describe('ensureFlowNeoConfig', () => {
  it('从模板复制到 .flow-neo/config', () => {
    ensureFlowNeoConfig(cwd, pluginRoot)
    expect(existsSync(join(cwd, '.flow-neo/config/plugin.config.json'))).toBe(true)
  })
  it('已存在则跳过不覆盖', () => {
    ensureFlowNeoConfig(cwd, pluginRoot)
    writeFileSync(join(cwd, '.flow-neo/config/plugin.config.json'), '{"custom":true}')
    ensureFlowNeoConfig(cwd, pluginRoot)
    expect(readFileSync(join(cwd, '.flow-neo/config/plugin.config.json'), 'utf8')).toBe('{"custom":true}')
  })
})

describe('init 端到端', () => {
  it('claude 端：skills + hooks + settings + .flow-neo/config', () => {
    const done = init({ target: 'claude', scope: 'project' }, cwd, pluginRoot)
    expect(existsSync(join(cwd, '.claude/skills/_router/SKILL.md'))).toBe(true)
    expect(existsSync(join(cwd, '.claude/flowneo/hooks/session-start.js'))).toBe(true)
    const settings = JSON.parse(readFileSync(join(cwd, '.claude/settings.json'), 'utf8'))
    expect(settings.hooks.SessionStart).toBeDefined()
    expect(existsSync(join(cwd, '.flow-neo/config/plugin.config.json'))).toBe(true)
    expect(existsSync(join(cwd, '.codex'))).toBe(false)
    expect(done).toContain('claude skills')
    expect(done).toContain('claude hooks + settings')
    expect(done).toContain('.flow-neo/config')
  })
  it('codex 端：skills + AGENTS.md 标记段', () => {
    const done = init({ target: 'codex', scope: 'project' }, cwd, pluginRoot)
    expect(existsSync(join(cwd, '.codex/skills/_router/SKILL.md'))).toBe(true)
    expect(readFileSync(join(cwd, 'AGENTS.md'), 'utf8')).toBe(`${SECTION}\n`)
    expect(existsSync(join(cwd, '.claude'))).toBe(false)
    expect(done).toContain('codex AGENTS.md 标记段')
  })
  it('all：双端齐装', () => {
    init({ target: 'all', scope: 'project' }, cwd, pluginRoot)
    expect(existsSync(join(cwd, '.claude/skills/_router/SKILL.md'))).toBe(true)
    expect(existsSync(join(cwd, '.codex/skills/_router/SKILL.md'))).toBe(true)
    expect(existsSync(join(cwd, '.claude/settings.json'))).toBe(true)
    expect(existsSync(join(cwd, 'AGENTS.md'))).toBe(true)
  })
  it('重复 init 幂等（AGENTS 段原位替换不增长、hooks 不叠加）', () => {
    writeFileSync(join(cwd, 'AGENTS.md'), '# 用户约定\n')
    init({ target: 'all', scope: 'project' }, cwd, pluginRoot)
    const agentsOnce = readFileSync(join(cwd, 'AGENTS.md'), 'utf8')
    init({ target: 'all', scope: 'project' }, cwd, pluginRoot)
    const settings = JSON.parse(readFileSync(join(cwd, '.claude/settings.json'), 'utf8'))
    expect(settings.hooks.SessionStart).toHaveLength(1)
    expect(readFileSync(join(cwd, 'AGENTS.md'), 'utf8')).toBe(agentsOnce)
  })
})

describe('remove 端到端', () => {
  it('claude 端：只删 FlowNeo 技能目录，保留用户技能与目录', () => {
    init({ target: 'claude', scope: 'project' }, cwd, pluginRoot)
    mkdirSync(join(cwd, '.claude/skills/my-own-skill'), { recursive: true })
    writeFileSync(join(cwd, '.claude/skills/my-own-skill/SKILL.md'), '# mine')
    const done = remove({ target: 'claude', scope: 'project' }, cwd)
    expect(existsSync(join(cwd, '.claude/skills/my-own-skill/SKILL.md'))).toBe(true)
    expect(existsSync(join(cwd, '.claude/skills/01-need-explore'))).toBe(false)
    expect(existsSync(join(cwd, '.claude/skills/_router'))).toBe(false)
    expect(existsSync(join(cwd, '.claude/flowneo'))).toBe(false)
    expect(existsSync(join(cwd, '.claude/settings.json'))).toBe(true)
    const settings = JSON.parse(readFileSync(join(cwd, '.claude/settings.json'), 'utf8'))
    expect(settings.hooks.SessionStart).toBeUndefined()
    expect(done).toContain('claude hooks 注销')
  })
  it('codex 端：移除技能目录与 AGENTS.md 标记段（保留用户内容）', () => {
    init({ target: 'codex', scope: 'project' }, cwd, pluginRoot)
    writeFileSync(join(cwd, 'AGENTS.md'), `# 用户约定\n\n${SECTION}\n`)
    const done = remove({ target: 'codex', scope: 'project' }, cwd)
    expect(readFileSync(join(cwd, 'AGENTS.md'), 'utf8')).toBe('# 用户约定\n')
    expect(existsSync(join(cwd, '.codex/skills/_router'))).toBe(false)
    expect(existsSync(join(cwd, '.codex/skills'))).toBe(true)
    expect(done).toContain('codex AGENTS.md 标记段移除')
  })
  it('codex 端无标记段时 done 不含 AGENTS 项', () => {
    const done = remove({ target: 'codex', scope: 'project' }, cwd)
    expect(done).not.toContain('codex AGENTS.md 标记段移除')
  })
  it('all：init 后 remove 双端清理，.flow-neo/config 保留', () => {
    init({ target: 'all', scope: 'project' }, cwd, pluginRoot)
    remove({ target: 'all', scope: 'project' }, cwd)
    expect(existsSync(join(cwd, '.claude/skills/02-design-plan'))).toBe(false)
    expect(existsSync(join(cwd, '.codex/skills/03-task-execute'))).toBe(false)
    expect(existsSync(join(cwd, '.claude/flowneo'))).toBe(false)
    expect(readFileSync(join(cwd, 'AGENTS.md'), 'utf8')).toBe('\n')
    expect(existsSync(join(cwd, '.flow-neo/config/plugin.config.json'))).toBe(true)
  })
  it('remove 保留用户自有 hooks', () => {
    init({ target: 'claude', scope: 'project' }, cwd, pluginRoot)
    const file = join(cwd, '.claude/settings.json')
    const settings = JSON.parse(readFileSync(file, 'utf8'))
    settings.hooks.PreCompact = [{ hooks: [{ type: 'command', command: 'echo user' }] }]
    writeFileSync(file, JSON.stringify(settings, null, 2))
    remove({ target: 'claude', scope: 'project' }, cwd)
    const after = JSON.parse(readFileSync(file, 'utf8'))
    expect(after.hooks.PreCompact).toHaveLength(1)
    expect(after.hooks.SessionStart).toBeUndefined()
  })
})
