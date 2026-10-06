import {expect, it} from 'vitest'
import {unwrapGenerationResult} from '..'

it('should preserve successful values and distinguish error detail from fallback', () => {
  const value = {tokens: 3}
  expect(unwrapGenerationResult({ok: true, value}, 'fallback')).toBe(value)
  expect(() =>
    unwrapGenerationResult(
      {error: {code: 'cancelled', phase: 'generate', retryable: false}, ok: false},
      'fallback',
    ),
  ).toThrow('fallback')
  expect(() =>
    unwrapGenerationResult(
      {
        error: {code: 'cancelled', detail: 'detail', phase: 'generate', retryable: false},
        ok: false,
      },
      'fallback',
    ),
  ).toThrow('detail')
})
