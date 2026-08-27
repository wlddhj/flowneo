import { hookContext } from '../lib/inject.ts'
import { buildTurnReminder } from '../lib/router.ts'

const context = buildTurnReminder(process.cwd())
process.stdout.write(hookContext('UserPromptSubmit', context))
