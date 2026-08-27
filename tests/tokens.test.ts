import { describe, expect, it } from 'vitest'
import { estimateTokens } from '../src/lib/tokens.ts'

describe('estimateTokens', () => {
  it('空字符串为 0', () => {
    expect(estimateTokens('')).toBe(0)
  })
  it('纯 ASCII 约 4 字符 1 token', () => {
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('abcdefgh')).toBe(2)
  })
  it('纯中文 1 字 1 token', () => {
    expect(estimateTokens('一二三')).toBe(3)
  })
  it('混合文本分别累计', () => {
    // 3 个中文 + 8 个 ASCII = 3 + 2 = 5
    expect(estimateTokens('一二三abcdefgh')).toBe(5)
  })
})
