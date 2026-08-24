import {describe, expect, expectTypeOf, it} from 'vitest'

import {
  failureResult,
  type FailureResult,
  type Result,
  successResult,
  type SuccessResult,
} from '../result'

interface TestFailure {
  readonly code: 'failed'
}

const readResult = (result: Result<number, TestFailure>) => {
  if (result.ok) {
    expectTypeOf(result).toEqualTypeOf<SuccessResult<number>>()
    return result.value
  }

  expectTypeOf(result).toEqualTypeOf<FailureResult<TestFailure>>()
  return result.error.code
}

describe('Result', () => {
  it('should create success and failure variants', () => {
    expect(successResult(42)).toEqual({ok: true, value: 42})
    expect(failureResult({code: 'failed'} as const)).toEqual({
      error: {code: 'failed'},
      ok: false,
    })
  })

  it('should narrow each variant by ok', () => {
    expect(readResult(successResult(42))).toBe(42)
    expect(readResult(failureResult({code: 'failed'}))).toBe('failed')
  })

  it('should preserve the serializable object contract', () => {
    const success = successResult({requestId: 1})
    const failure = failureResult({code: 'failed'} as const)

    expect(structuredClone(success)).toEqual({ok: true, value: {requestId: 1}})
    expect(structuredClone(failure)).toEqual({error: {code: 'failed'}, ok: false})
    expect(JSON.stringify(success)).toBe('{"ok":true,"value":{"requestId":1}}')
    expect(JSON.stringify(failure)).toBe('{"error":{"code":"failed"},"ok":false}')
  })
})
