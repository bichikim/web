import {describe, expect, it} from 'vitest'
import {nonReasoningTokens} from '../usage.mjs'

describe('nonReasoningTokens', () => {
  it('should exclude internal reasoning from generated output', () => {
    expect(nonReasoningTokens({output: 2637, reasoning: 2289})).toBe(348)
  })
  it('should retain all output when reasoning is absent', () => {
    expect(nonReasoningTokens({output: 2049})).toBe(2049)
  })
  it('should accept zero usage', () => {
    expect(nonReasoningTokens({output: 0, reasoning: 0})).toBe(0)
  })
  it.each([
    {output: 10, reasoning: 11},
    {output: -1},
    {output: 10, reasoning: -1},
    {output: 10, reasoning: Number.NaN},
    {output: Number.NaN},
    {output: 1.5},
  ])('should reject inconsistent token accounting: %j', (usage) => {
    expect(() => nonReasoningTokens(usage)).toThrow()
  })
})
