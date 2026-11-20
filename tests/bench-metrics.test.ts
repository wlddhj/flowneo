import { describe, expect, it } from 'vitest'
import { parseStream, aggregate, reeditMax, isWaitingConfirm } from '../benchmarks/src/metrics.ts'

const STREAM = [
  JSON.stringify({ type: 'system', subtype: 'init', session_id: 'sess-1' }),
  JSON.stringify({
    type: 'assistant',
    message: {
      content: [
        { type: 'text', text: '我先看看代码' },
        { type: 'tool_use', name: 'Edit', input: { file_path: '/tmp/a.ts' } },
        { type: 'tool_use', name: 'Edit', input: { file_path: '/tmp/a.ts' } },
        { type: 'tool_use', name: 'Write', input: { file_path: '/tmp/b.ts' } },
        { type: 'tool_use', name: 'Read', input: { file_path: '/tmp/c.ts' } },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
    },
  }),
  JSON.stringify({ type: 'result', num_turns: 4, duration_ms: 1500, total_cost_usd: 0.02, usage: { input_tokens: 100, output_tokens: 40 } }),
  '',
].join('\n')

describe('parseStream', () => {
  it('提取 session/turns/usage/cost 与编辑计数（Read 不计）', () => {
    const s = parseStream(STREAM)
    expect(s.sessionId).toBe('sess-1')
    expect(s.turns).toBe(4)
    expect(s.tokensIn).toBe(100)
    expect(s.tokensOut).toBe(40)
    expect(s.costUsd).toBeCloseTo(0.02)
    expect(s.durationMs).toBe(1500)
    expect(s.editCounts.get('/tmp/a.ts')).toBe(2)
    expect(s.editCounts.get('/tmp/b.ts')).toBe(1)
    expect(s.editCounts.has('/tmp/c.ts')).toBe(false)
    expect(reeditMax(s)).toBe(2)
  })
  it('流含 FlowNeo 字样时 flowneoSeen=true（污染检测）', () => {
    expect(parseStream(STREAM).flowneoSeen).toBe(false)
    const dirty = STREAM + '\n' + JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: '按 FLOWNEO_ROUTER 约束' }] } })
    expect(parseStream(dirty).flowneoSeen).toBe(true)
  })
  it('非 JSON 行跳过不抛错', () => {
    expect(() => parseStream('not json\n\n{"type":"result"}')).not.toThrow()
  })
  it('init.model 提取（--model 透传校验）与聚合', () => {
    const s = parseStream(JSON.stringify({ type: 'system', subtype: 'init', session_id: 's1', model: 'glm-5.3-flash' }))
    expect(s.model).toBe('glm-5.3-flash')
    expect(aggregate([parseStream(''), s]).model).toBe('glm-5.3-flash')
    expect(parseStream(STREAM).model).toBeNull()
  })
})

describe('aggregate（多段续轮）', () => {
  it('求和与末段文本', () => {
    const a = parseStream(STREAM)
    const b = parseStream([
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: '请确认方案' }] } }),
      JSON.stringify({ type: 'result', num_turns: 2, duration_ms: 500, total_cost_usd: 0.01, usage: { input_tokens: 50, output_tokens: 20 } }),
    ].join('\n'))
    const t = aggregate([a, b])
    expect(t.turns).toBe(6)
    expect(t.tokensIn).toBe(150)
    expect(t.costUsd).toBeCloseTo(0.03)
    expect(t.lastAssistantText).toBe('请确认方案')
    expect(t.editCounts.get('/tmp/a.ts')).toBe(2)
  })
})

describe('isWaitingConfirm（停等标记）', () => {
  it('归档问询优先于确认', () => {
    expect(isWaitingConfirm('……是否归档迁移至 history/？')).toBe('archive')
    expect(isWaitingConfirm('## 待确认清单\n请确认方案')).toBe('confirm')
    expect(isWaitingConfirm('已完成全部实现')).toBe(null)
  })
})
