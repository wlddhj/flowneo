import { hookContext } from '../lib/inject.ts'
import { safeTurnReminder } from '../lib/router.ts'

const context = safeTurnReminder(process.cwd())
process.stdout.write(hookContext('UserPromptSubmit', context))
