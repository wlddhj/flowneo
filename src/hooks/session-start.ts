import { hookContext } from '../lib/inject.ts'
import { safeSessionContext } from '../lib/router.ts'

const context = safeSessionContext(process.cwd(), process.env.CLAUDE_PLUGIN_ROOT)
process.stdout.write(hookContext('SessionStart', context))
