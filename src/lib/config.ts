import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface Config {
  reminders: { perTurn: boolean }
  archive: { strategy: 'auto' | 'manual' | 'prompt' }
  lint: { routerLimit: number }
  schema: { strictness: 'strict' | 'loose' }
  stages: { skipDesign: boolean; skipReview: boolean }
}

export const DEFAULT_CONFIG: Config = {
  reminders: { perTurn: true },
  archive: { strategy: 'prompt' },
  lint: { routerLimit: 1500 },
  schema: { strictness: 'loose' },
  stages: { skipDesign: false, skipReview: false },
}

export function readConfig(cwd: string): Config {
  const file = join(cwd, '.flow-neo/config/plugin.config.json')
  if (!existsSync(file)) return structuredClone(DEFAULT_CONFIG)
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    return {
      reminders: { ...DEFAULT_CONFIG.reminders, ...raw.reminders },
      archive: { ...DEFAULT_CONFIG.archive, ...raw.archive },
      lint: { ...DEFAULT_CONFIG.lint, ...raw.lint },
      schema: { ...DEFAULT_CONFIG.schema, ...raw.schema },
      stages: { ...DEFAULT_CONFIG.stages, ...raw.stages },
    }
  } catch {
    return structuredClone(DEFAULT_CONFIG)
  }
}
