/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {runEventTask, type RunEventTaskOptions} from '..'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const createTask = () => {
  const target = new EventTarget()
  const controller = new AbortController()
  const error = new Error('failed')
  const options: RunEventTaskOptions<string | null> = {
    failureEvent: 'failure',
    onAbort: vi.fn(() => null),
    onFailure: vi.fn(() => {
      throw error
    }),
    onReady: vi.fn(() => 'ready'),
    readyEvent: 'ready',
    signal: controller.signal,
    start: vi.fn(),
    target,
    timeoutMs: 1000,
  }
  const addTarget = vi.spyOn(target, 'addEventListener')
  const removeTarget = vi.spyOn(target, 'removeEventListener')
  const addSignal = vi.spyOn(controller.signal, 'addEventListener')
  const removeSignal = vi.spyOn(controller.signal, 'removeEventListener')
  const expectReleased = () => {
    for (const [event, listener] of addTarget.mock.calls) {
      expect(removeTarget).toHaveBeenCalledWith(event, listener, false)
    }
    for (const [event, listener] of addSignal.mock.calls) {
      expect(removeSignal).toHaveBeenCalledWith(event, listener, false)
    }
    expect(removeTarget).toHaveBeenCalledTimes(2)
    expect(removeSignal).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  }
  return {controller, error, expectReleased, options, target}
}

it('should subscribe before starting and clean up before synchronously producing the result', async () => {
  const {expectReleased, options, target} = createTask()
  const onReady = vi.fn(() => {
    expectReleased()
    target.dispatchEvent(new Event('failure'))
    return 'result'
  })
  const pending = runEventTask({
    ...options,
    onReady,
    start: () => target.dispatchEvent(new Event('ready')),
  })
  expect(onReady).toHaveBeenCalledOnce()
  await expect(pending).resolves.toBe('result')
  expect(options.onFailure).not.toHaveBeenCalled()
})

it.each(['failure', 'abort', 'timeout'] as const)(
  'should settle once and release subscriptions after %s',
  async (outcome) => {
    const {controller, error, expectReleased, options, target} = createTask()
    const pending = runEventTask(options)
    const assertion =
      outcome === 'abort'
        ? expect(pending).resolves.toBeNull()
        : expect(pending).rejects.toBe(error)
    if (outcome === 'abort') {
      controller.abort()
    } else if (outcome === 'failure') {
      target.dispatchEvent(new Event('failure'))
    } else {
      vi.advanceTimersByTime(999)
      expect(options.onFailure).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
    }
    expectReleased()
    target.dispatchEvent(new Event('ready'))
    target.dispatchEvent(new Event('failure'))
    controller.abort()
    await assertion
    expect(options.onReady).not.toHaveBeenCalled()
    expect(options.onFailure).toHaveBeenCalledTimes(outcome === 'abort' ? 0 : 1)
    expect(options.onAbort).toHaveBeenCalledTimes(outcome === 'abort' ? 1 : 0)
  },
)

it('should leave pre-aborted work unstarted without registering resources', async () => {
  const {controller, options, target} = createTask()
  controller.abort()
  await expect(runEventTask(options)).resolves.toBeNull()
  expect(options.start).not.toHaveBeenCalled()
  expect(target.addEventListener).not.toHaveBeenCalled()
  expect(controller.signal.addEventListener).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})

it.each([undefined, null, false, 0, new Error('start')])(
  'should preserve a synchronous start failure: %s',
  async (error) => {
    const {expectReleased, options} = createTask()
    await expect(
      runEventTask({
        ...options,
        start: () => {
          throw error
        },
      }),
    ).rejects.toBe(error)
    expectReleased()
    expect(options.onFailure).not.toHaveBeenCalled()
  },
)

it.each(['ready', 'failure', 'abort'] as const)(
  'should retain the first %s outcome when start later throws',
  async (outcome) => {
    const {controller, error, expectReleased, options, target} = createTask()
    const pending = runEventTask({
      ...options,
      start: () => {
        if (outcome === 'abort') {
          controller.abort()
        } else {
          target.dispatchEvent(new Event(outcome))
        }
        throw new Error('later')
      },
    })
    if (outcome === 'failure') {
      await expect(pending).rejects.toBe(error)
    } else {
      await expect(pending).resolves.toBe(outcome === 'ready' ? 'ready' : null)
    }
    expectReleased()
  },
)

it('should keep concurrent tasks independent and permit a later task on the same target', async () => {
  const {controller, options, target} = createTask()
  const first = runEventTask(options)
  const second = runEventTask({...options, signal: new AbortController().signal})
  controller.abort()
  await expect(first).resolves.toBeNull()
  target.dispatchEvent(new Event('ready'))
  await expect(second).resolves.toBe('ready')
  const third = runEventTask({...options, signal: new AbortController().signal})
  target.dispatchEvent(new Event('ready'))
  await expect(third).resolves.toBe('ready')
  expect(vi.getTimerCount()).toBe(0)
})

it('should reject a result callback failure after releasing resources', async () => {
  const {expectReleased, options, target} = createTask()
  const error = new Error('result failed')
  const pending = runEventTask({
    ...options,
    onReady: () => {
      expectReleased()
      throw error
    },
  })
  const assertion = expect(pending).rejects.toBe(error)
  target.dispatchEvent(new Event('ready'))
  await assertion
})

it.each([null, undefined, false, 0, new Error('cancelled')])(
  'should preserve a pre-aborted callback failure: %s',
  async (reason) => {
    const {controller, options} = createTask()
    controller.abort()
    await expect(
      runEventTask({
        ...options,
        onAbort: () => {
          throw reason
        },
      }),
    ).rejects.toBe(reason)
    expect(options.start).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  },
)

it('should preserve a task started reentrantly from the previous result callback', async () => {
  const {options, target} = createTask()
  let next: Promise<string | null> | undefined
  const first = runEventTask({
    ...options,
    onReady: () => {
      next = runEventTask(options)
      return 'first'
    },
  })
  target.dispatchEvent(new Event('ready'))
  await expect(first).resolves.toBe('first')
  expect(vi.getTimerCount()).toBe(1)
  target.dispatchEvent(new Event('ready'))
  await expect(next).resolves.toBe('ready')
  expect(vi.getTimerCount()).toBe(0)
})

it.each([1, 10, 100])(
  'should release all resources across %i repeated cancellations',
  async (count) => {
    const target = new EventTarget()
    const add = vi.spyOn(target, 'addEventListener')
    const remove = vi.spyOn(target, 'removeEventListener')
    const {options} = createTask()
    const results = Array.from({length: count}, () => {
      const controller = new AbortController()
      const result = runEventTask({...options, signal: controller.signal, target})
      controller.abort()
      return result
    })
    await expect(Promise.all(results)).resolves.toEqual(Array.from({length: count}, () => null))
    expect(add).toHaveBeenCalledTimes(count * 2)
    expect(remove).toHaveBeenCalledTimes(count * 2)
    expect(vi.getTimerCount()).toBe(0)
  },
)
