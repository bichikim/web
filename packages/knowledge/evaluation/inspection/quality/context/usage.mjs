import assert from 'node:assert/strict'

/** Returns non-reasoning output tokens, including any provider formatting overhead. */
export const nonReasoningTokens = (usage) => {
  const {output} = usage
  const reasoning = usage.reasoning ?? 0
  assert.ok(Number.isSafeInteger(output) && output >= 0)
  assert.ok(Number.isSafeInteger(reasoning) && reasoning >= 0 && reasoning <= output)
  return output - reasoning
}
