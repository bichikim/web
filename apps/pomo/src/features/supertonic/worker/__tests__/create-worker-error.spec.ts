import {describe, expect, it, vi} from 'vitest'
import {createWorkerError} from '../create-worker-error'

describe('createWorkerError', () => {
  it.each(['generate', 'initialize'] as const)(
    'should retain the %s phase and serializable failure fields',
    (phase) => {
      const result = createWorkerError(phase, new Error('engine failed'))
      expect(result).toEqual({
        code: 'worker-failed',
        detail: 'engine failed',
        phase,
        retryable: true,
      })
      expect(structuredClone(result)).toEqual(result)
    },
  )

  it.each(['', '  ', '음성 오류'])(
    'should preserve the Error message without normalization: %j',
    (message) => {
      expect(createWorkerError('generate', new Error(message)).detail).toBe(message)
    },
  )

  it.each([null, undefined, 'failure', 42, Symbol('failure')])(
    'should use the existing fallback for a non-Error value: %j',
    (error) => {
      expect(createWorkerError('initialize', error).detail).toBe('알 수 없는 오류')
    },
  )

  it('should ignore a structural message getter without coercing its value', () => {
    const message = vi.fn(() => 'structural message')
    const error = Object.defineProperty({}, 'message', {get: message})
    expect(createWorkerError('generate', error).detail).toBe('알 수 없는 오류')
    expect(message).not.toHaveBeenCalled()
  })

  it('should read an Error message once with its original receiver', () => {
    const error = new Error()
    const message = vi.fn(function message(this: Error) {
      expect(this).toBe(error)
      return 'getter detail'
    })
    Object.defineProperty(error, 'message', {get: message})
    expect(createWorkerError('generate', error).detail).toBe('getter detail')
    expect(message).toHaveBeenCalledOnce()
  })

  it('should propagate the original message getter failure', () => {
    const cause = new Error('getter failed')
    const error = Object.defineProperty(new Error(), 'message', {
      get() {
        throw cause
      },
    })
    let failure: unknown
    try {
      createWorkerError('initialize', error)
    } catch (caught) {
      failure = caught
    }
    expect(failure).toBe(cause)
  })

  it('should allocate independent records when a getter reenters the constructor', () => {
    let nested: ReturnType<typeof createWorkerError> | undefined
    const error = Object.defineProperty(new Error(), 'message', {
      get() {
        nested = createWorkerError('initialize', new Error('nested'))
        return 'outer'
      },
    })
    const result = createWorkerError('generate', error)
    expect(result.detail).toBe('outer')
    expect(nested).toEqual({
      code: 'worker-failed',
      detail: 'nested',
      phase: 'initialize',
      retryable: true,
    })
    expect(result).not.toBe(nested)
  })
})
