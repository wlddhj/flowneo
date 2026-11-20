/** 解析 claude -p --output-format stream-json 的流：usage/turns/编辑计数/停等检测 */
export interface StreamStats {
  sessionId: string | null
  turns: number
  tokensIn: number
  tokensOut: number
  costUsd: number
  durationMs: number
  /** 文件路径 -> Edit/Write/MultiEdit 次数（返工代理的原始数据） */
  editCounts: Map<string, number>
  lastAssistantText: string
  /** 流内出现 FlowNeo 字样（baseline 臂必须为 false，防 hook 污染） */
  flowneoSeen: boolean
  /** 本段调用过 AskUserQuestion（headless 下降级失败，是最强停等信号） */
  askUserCalled: boolean
  /** 服务端确认的实际模型（init 事件，透传校验用） */
  model: string | null
}

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit'])

export function parseStream(text: string): StreamStats {
  const stats: StreamStats = {
    sessionId: null,
    turns: 0,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    durationMs: 0,
    editCounts: new Map(),
    lastAssistantText: '',
    flowneoSeen: /flow-?neo/i.test(text),
    askUserCalled: false,
    model: null,
  }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    let ev: any
    try {
      ev = JSON.parse(line)
    } catch {
      continue
    }
    if (ev.type === 'system' && ev.subtype === 'init' && ev.session_id) {
      stats.sessionId = ev.session_id
      if (ev.model) stats.model = ev.model
    } else if (ev.type === 'assistant' && ev.message) {
      for (const block of ev.message.content ?? []) {
        if (block.type === 'text' && block.text) stats.lastAssistantText = block.text
        if (block.type === 'tool_use' && EDIT_TOOLS.has(block.name)) {
          const file = block.input?.file_path ?? '(unknown)'
          stats.editCounts.set(file, (stats.editCounts.get(file) ?? 0) + 1)
        }
        if (block.type === 'tool_use' && block.name === 'AskUserQuestion') stats.askUserCalled = true
      }
    } else if (ev.type === 'result') {
      stats.turns = ev.num_turns ?? stats.turns
      stats.tokensIn = ev.usage?.input_tokens ?? stats.tokensIn
      stats.tokensOut = ev.usage?.output_tokens ?? stats.tokensOut
      stats.costUsd = ev.total_cost_usd ?? stats.costUsd
      stats.durationMs = ev.duration_ms ?? stats.durationMs
    }
  }
  return stats
}

/** 多段会话（--resume 续轮）聚合：计数求和，文本取末段 */
export function aggregate(parts: StreamStats[]): StreamStats {
  const total: StreamStats = {
    sessionId: null,
    turns: 0,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    durationMs: 0,
    editCounts: new Map(),
    lastAssistantText: '',
    flowneoSeen: false,
    askUserCalled: false,
    model: null,
  }
  for (const p of parts) {
    total.sessionId = p.sessionId ?? total.sessionId
    total.turns += p.turns
    total.tokensIn += p.tokensIn
    total.tokensOut += p.tokensOut
    total.costUsd += p.costUsd
    total.durationMs += p.durationMs
    total.lastAssistantText = p.lastAssistantText || total.lastAssistantText
    total.flowneoSeen = total.flowneoSeen || p.flowneoSeen
    total.askUserCalled = total.askUserCalled || p.askUserCalled
    total.model = p.model ?? total.model
    for (const [file, n] of p.editCounts) {
      total.editCounts.set(file, (total.editCounts.get(file) ?? 0) + n)
    }
  }
  return total
}

/** 返工代理：单文件最大编辑次数 */
export function reeditMax(stats: StreamStats): number {
  return Math.max(0, ...stats.editCounts.values())
}

/** 停等强短语：02 待确认清单 / 05 归档问询（headless 话术多样，AskUserQuestion 工具调用是最强信号） */
export const WAIT_PATTERNS = [
  '请确认方案', '待确认清单', '是否归档迁移',
  /回复.{0,8}全部确认/.source, /确认后.{0,12}(进入|推进|编码|写入)/.source, /请(逐条)?确认/.source,
]

export function isWaitingConfirm(lastText: string, askUserCalled = false): 'confirm' | 'archive' | null {
  if (lastText.includes('是否归档迁移')) return 'archive'
  if (askUserCalled) return 'confirm'
  if (WAIT_PATTERNS.some((p) => new RegExp(p).test(lastText))) return 'confirm'
  return null
}
