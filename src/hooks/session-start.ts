import { readFileSync } from 'node:fs'
import { hookContext } from '../lib/inject.ts'
import { safeSessionContext } from '../lib/router.ts'
import { cleanSessions, parseSessionId } from '../lib/tasks.ts'

const cwd = process.cwd()
let sessionId: string | null = null
try {
  sessionId = parseSessionId(readFileSync(0, 'utf8'))
} catch {
  sessionId = null
}
try {
  cleanSessions(cwd, 7 * 24 * 3600 * 1000)
} catch {
  /* 清理失败不阻塞注入 */
}
const context = safeSessionContext(cwd, process.env.CLAUDE_PLUGIN_ROOT, sessionId)
process.stdout.write(hookContext('SessionStart', context))
