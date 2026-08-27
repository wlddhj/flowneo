import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface TaskSummary {
  slug: string
  task: string
  stage: string
}

export function makeSlug(name: string, existing: string[]): string {
  const base = name.trim().replace(/[\s_/.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'task'
  if (!existing.includes(base)) return base
  let n = 2
  while (existing.includes(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export function readBinding(cwd: string, sessionId: string): string | null {
  const file = join(cwd, 'sessions', `${sessionId}.md`)
  if (!existsSync(file)) return null
  return readFileSync(file, 'utf8').match(/^task:\s*(\S+)\s*$/m)?.[1] ?? null
}

export function writeBinding(cwd: string, sessionId: string, slug: string): void {
  const dir = join(cwd, 'sessions')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${sessionId}.md`), `task: ${slug}\n`)
}

export function listTasks(cwd: string): TaskSummary[] {
  const dir = join(cwd, 'tasks')
  if (!existsSync(dir)) return []
  const out: TaskSummary[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = join(dir, entry.name, 'status.md')
    if (!existsSync(file)) continue
    const raw = readFileSync(file, 'utf8')
    const pick = (key: string) => raw.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? ''
    out.push({ slug: entry.name, task: pick('task'), stage: pick('stage') })
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug))
}

export function cleanSessions(cwd: string, maxAgeMs: number): number {
  const dir = join(cwd, 'sessions')
  if (!existsSync(dir)) return 0
  let removed = 0
  const cutoff = Date.now() - maxAgeMs
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.md')) continue
    const file = join(dir, f)
    if (statSync(file).mtimeMs < cutoff) {
      rmSync(file)
      removed++
    }
  }
  return removed
}

export function parseSessionId(input: string): string | null {
  try {
    const v = JSON.parse(input)?.session_id
    return typeof v === 'string' && v.length > 0 ? v : null
  } catch {
    return null
  }
}
