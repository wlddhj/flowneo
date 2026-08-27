const CJK_RE = /[一-鿿　-〿＀-￯]/g

export function estimateTokens(text: string): number {
  const cjk = (text.match(CJK_RE) ?? []).length
  return Math.ceil(cjk + (text.length - cjk) / 4)
}
