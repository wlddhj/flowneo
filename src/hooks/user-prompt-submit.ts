import { readFileSync } from 'node:fs'
import { hookContext } from '../lib/inject.ts'
import { safeTurnReminder } from '../lib/router.ts'
import { parseSessionId } from '../lib/tasks.ts'
import { readConfig } from '../lib/config.ts'

let sessionId: string | null = null
try {
  sessionId = parseSessionId(readFileSync(0, 'utf8'))
} catch {
  sessionId = null
}
const cwd = process.cwd()
const config = readConfig(cwd)
const context = config.reminders.perTurn === false ? '' : safeTurnReminder(cwd, sessionId)
process.stdout.write(hookContext('UserPromptSubmit', context))
