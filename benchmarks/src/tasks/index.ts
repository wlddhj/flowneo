import type { BenchTask } from '../types.ts'
import {
  CLI_SUBCOMMAND, API_PAGINATION, CONFIG_MIGRATE, CACHE_LAYER,
  MULTI_FORMAT_EXPORT, ERROR_TAXONOMY, RETRY_IDEMPOTENT, LOG_REDACT,
  VALIDATE_BOUNDARY, REFACTOR_EXTRACT,
} from './heavy.ts'
import { FIX_OFFBYONE, ADD_VERBOSE_FLAG, DOCS_UPDATE } from './light.ts'

/** 13 张任务卡（10 重 + 3 轻） */
export const TASKS: BenchTask[] = [
  CLI_SUBCOMMAND, API_PAGINATION, CONFIG_MIGRATE, CACHE_LAYER,
  MULTI_FORMAT_EXPORT, ERROR_TAXONOMY, RETRY_IDEMPOTENT, LOG_REDACT,
  VALIDATE_BOUNDARY, REFACTOR_EXTRACT,
  FIX_OFFBYONE, ADD_VERBOSE_FLAG, DOCS_UPDATE,
]

export function findTask(id: string): BenchTask {
  const task = TASKS.find((t) => t.id === id)
  if (!task) throw new Error(`未知任务卡：${id}`)
  return task
}
