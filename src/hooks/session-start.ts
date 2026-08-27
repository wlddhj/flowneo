import { hookContext } from '../lib/inject.ts'
import { buildSessionContext } from '../lib/router.ts'

const context = buildSessionContext(process.cwd(), process.env.CLAUDE_PLUGIN_ROOT)
process.stdout.write(hookContext('SessionStart', context))
