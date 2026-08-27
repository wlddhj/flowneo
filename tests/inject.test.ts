import { describe, expect, it } from 'vitest'
import { hookContext } from '../src/lib/inject.ts'

describe('hookContext', () => {
  it('输出 CC hook 标准 JSON', () => {
    const out = JSON.parse(hookContext('SessionStart', '你好'))
    expect(out.hookSpecificOutput.hookEventName).toBe('SessionStart')
    expect(out.hookSpecificOutput.additionalContext).toBe('你好')
  })
  it('转义特殊字符保持 JSON 合法', () => {
    const out = JSON.parse(hookContext('UserPromptSubmit', 'a"b\nc\\d'))
    expect(out.hookSpecificOutput.additionalContext).toBe('a"b\nc\\d')
  })
})
