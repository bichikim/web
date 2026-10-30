/** @vitest-environment node */
import {afterEach, expect, test, vi} from 'vitest'
import {withAbort} from '../with-abort'

afterEach(() => vi.restoreAllMocks())

test('should not start an operation when its signal is already cancelled', () => {
  const controller = new AbortController()
  const reason = new Error('already cancelled')
  controller.abort(reason)
  const operation = vi.fn()
  expect(() => withAbort(operation, controller.signal)).toThrow(reason)
  expect(operation).not.toHaveBeenCalled()
})

test.each(['resolve', 'reject', 'throw'])(
  'should settle and remove the cancellation listener when an operation will %s',
  async (outcome) => {
    const controller = new AbortController()
    const remove = vi.spyOn(controller.signal, 'removeEventListener')
    const error = new Error('read failed')
    const operation = vi.fn(() => {
      switch (outcome) {
        case 'resolve':
          return Promise.resolve('read')
        case 'reject':
          return Promise.reject(error)
        case 'throw':
          throw error
        default:
          throw new Error('unexpected outcome')
      }
    })
    const pending = withAbort(operation, controller.signal)
    if (outcome === 'resolve') {
      await expect(pending).resolves.toBe('read')
    } else {
      await expect(pending).rejects.toBe(error)
    }
    expect(operation).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
  },
)

test.each(['resolve', 'reject'])(
  'should cancel promptly and consume a late operation %s',
  async (outcome) => {
    const controller = new AbortController()
    const remove = vi.spyOn(controller.signal, 'removeEventListener')
    let finish!: (value: string) => void
    let fail!: (reason: Error) => void
    const operation = new Promise<string>((resolve, reject) => {
      finish = resolve
      fail = reject
    })
    const pending = withAbort(() => operation, controller.signal)
    const reason = new SyntaxError('cancelled')
    controller.abort(reason)
    await expect(pending).rejects.toBe(reason)
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
    if (outcome === 'resolve') {
      finish('late result')
    } else {
      fail(new Error('late native error'))
    }
    await expect(pending).rejects.toBe(reason)
  },
)
