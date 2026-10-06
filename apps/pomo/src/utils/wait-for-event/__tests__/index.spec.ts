/** @vitest-environment node */
import {getEventListeners} from 'node:events'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {waitForEvent, type WaitForEventOptions} from '..'

const createOptions = () => {
  const target = new EventTarget()
  const controller = new AbortController()
  const error = new Error('operation failed')
  const start = vi.fn()
  const reason = vi.fn(() => error)
  const remove = vi.spyOn(target, 'removeEventListener')
  const removeAbort = vi.spyOn(controller.signal, 'removeEventListener')
  const options = {
    event: 'ready',
    failure: {event: 'failure', reason},
    signal: controller.signal,
    start,
    target,
    timeout: 100,
  } satisfies WaitForEventOptions
  return {controller, error, options, reason, remove, removeAbort, start, target}
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('waitForEvent', () => {
  it('should subscribe before starting and release listeners before synchronous success', async () => {
    const {options, reason, remove, removeAbort, start, target} = createOptions()
    start.mockImplementation(() => {
      target.dispatchEvent(new Event('ready'))
      expect(remove).toHaveBeenCalledTimes(2)
      expect(removeAbort).toHaveBeenCalledOnce()
      expect(vi.getTimerCount()).toBe(0)
    })
    await expect(waitForEvent(options)).resolves.toBeUndefined()
    expect(start).toHaveBeenCalledOnce()
    expect(reason).not.toHaveBeenCalled()
  })

  it('should keep waiting for unrelated events and allow asynchronous success', async () => {
    const {options, target} = createOptions()
    const pending = waitForEvent(options)
    target.dispatchEvent(new Event('other'))
    expect(vi.getTimerCount()).toBe(1)
    target.dispatchEvent(new Event('ready'))
    await expect(pending).resolves.toBeUndefined()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should reject failure with the caller reason and release all registrations', async () => {
    const {error, options, reason, remove, removeAbort, target} = createOptions()
    const pending = waitForEvent(options)
    target.dispatchEvent(new Event('failure'))
    await expect(pending).rejects.toBe(error)
    target.dispatchEvent(new Event('failure'))
    expect(reason).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledTimes(2)
    expect(removeAbort).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should apply the same failure policy at the deadline without firing early', async () => {
    const {error, options, reason, remove, removeAbort} = createOptions()
    const pending = waitForEvent(options)
    const assertion = expect(pending).rejects.toBe(error)
    vi.advanceTimersByTime(99)
    expect(reason).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    await assertion
    expect(reason).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledTimes(2)
    expect(removeAbort).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should reject cancellation with its exact reason and release all registrations', async () => {
    const {controller, options, reason, remove, removeAbort} = createOptions()
    const error = {cancelled: true}
    const pending = waitForEvent(options)
    controller.abort(error)
    await expect(pending).rejects.toBe(error)
    expect(reason).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledTimes(2)
    expect(removeAbort).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should not subscribe, allocate a deadline, or start when already aborted', async () => {
    const {controller, options, start, target} = createOptions()
    const add = vi.spyOn(target, 'addEventListener')
    const addAbort = vi.spyOn(controller.signal, 'addEventListener')
    controller.abort('cancelled')
    await expect(waitForEvent(options)).rejects.toBe('cancelled')
    expect(add).not.toHaveBeenCalled()
    expect(addAbort).not.toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([new Error('start failed'), undefined])(
    'should reject a synchronous start exception verbatim: %s',
    async (error) => {
      const {options, remove, removeAbort, start} = createOptions()
      start.mockImplementation(() => {
        throw error
      })
      await expect(waitForEvent(options)).rejects.toBe(error)
      expect(remove).toHaveBeenCalledTimes(2)
      expect(removeAbort).toHaveBeenCalledOnce()
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it.each(['ready', 'failure', 'abort'] as const)(
    'should retain the first outcome when %s wins competing notifications',
    async (first) => {
      const {controller, error, options, reason, remove, removeAbort, start, target} =
        createOptions()
      const notify = (event: 'ready' | 'failure' | 'abort') => {
        if (event === 'abort') {
          controller.abort('cancelled')
        } else {
          target.dispatchEvent(new Event(event))
        }
      }
      start.mockImplementation(() => {
        notify(first)
        notify('ready')
        notify('failure')
        notify('abort')
        throw new Error('later start exception')
      })
      const pending = waitForEvent(options)
      switch (first) {
        case 'ready':
          await expect(pending).resolves.toBeUndefined()
          break
        case 'failure':
          await expect(pending).rejects.toBe(error)
          break
        case 'abort':
          await expect(pending).rejects.toBe('cancelled')
          break
      }
      expect(reason).toHaveBeenCalledTimes(first === 'failure' ? 1 : 0)
      expect(remove).toHaveBeenCalledTimes(2)
      expect(removeAbort).toHaveBeenCalledOnce()
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('should retain failure if its reason factory dispatches readiness', async () => {
    const {error, options, target} = createOptions()
    const pending = waitForEvent({
      ...options,
      failure: {
        event: 'failure',
        reason: () => {
          target.dispatchEvent(new Event('ready'))
          return error
        },
      },
    })
    target.dispatchEvent(new Event('failure'))
    await expect(pending).rejects.toBe(error)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should reject a throwing failure factory after releasing registrations', async () => {
    const {error, options, remove, removeAbort, target} = createOptions()
    const pending = waitForEvent({
      ...options,
      failure: {
        event: 'failure',
        reason: () => {
          throw error
        },
      },
    })
    target.dispatchEvent(new Event('failure'))
    await expect(pending).rejects.toBe(error)
    expect(remove).toHaveBeenCalledTimes(2)
    expect(removeAbort).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should release earlier subscriptions and deadline when registration throws', async () => {
    const {error, options, remove, removeAbort, start, target} = createOptions()
    const add = target.addEventListener.bind(target)
    vi.spyOn(target, 'addEventListener').mockImplementation((event, ...args) => {
      if (event === 'failure') {
        throw error
      }
      add(event, ...args)
    })
    await expect(waitForEvent(options)).rejects.toBe(error)
    expect(start).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledTimes(2)
    expect(removeAbort).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should release only its own subscriptions while concurrent waits stay independent', async () => {
    const {controller, options, target} = createOptions()
    const other = vi.fn()
    target.addEventListener('ready', other)
    const first = waitForEvent(options)
    const second = waitForEvent({...options, signal: new AbortController().signal})
    controller.abort('first cancelled')
    await expect(first).rejects.toBe('first cancelled')
    expect(vi.getTimerCount()).toBe(1)
    target.dispatchEvent(new Event('ready'))
    await expect(second).resolves.toBeUndefined()
    target.dispatchEvent(new Event('ready'))
    expect(other).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should retain the subscribed signal when the caller mutates its options', async () => {
    const {controller, options, remove, removeAbort, target} = createOptions()
    const pending = waitForEvent(options)
    options.signal = new AbortController().signal
    options.target = new EventTarget()
    options.event = 'changed'
    controller.abort('original cancellation')
    await expect(pending).rejects.toBe('original cancellation')
    expect(remove).toHaveBeenCalledWith('ready', expect.any(Function), false)
    expect(remove).toHaveBeenCalledWith('failure', expect.any(Function), false)
    expect(removeAbort).toHaveBeenCalledOnce()
    target.dispatchEvent(new Event('ready'))
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should retain the original failure event and factory when their input object changes', async () => {
    const {error, options, reason, target} = createOptions()
    const changed = vi.fn(() => new Error('changed'))
    const pending = waitForEvent(options)
    options.failure.event = 'changed'
    options.failure.reason = changed
    target.dispatchEvent(new Event('failure'))
    await expect(pending).rejects.toBe(error)
    expect(reason).toHaveBeenCalledOnce()
    expect(changed).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should preserve the failure factory receiver', async () => {
    const {options, target} = createOptions()
    const failure = {
      event: 'failure',
      reason() {
        return this
      },
    }
    const pending = waitForEvent({...options, failure})
    target.dispatchEvent(new Event('failure'))
    await expect(pending).rejects.toBe(failure)
  })

  it.each([new Error('cleanup failed'), undefined])(
    'should attempt every release and reject the first cleanup exception: %s',
    async (error) => {
      const {controller, options, reason, removeAbort, target} = createOptions()
      const nativeRemove = EventTarget.prototype.removeEventListener.bind(target)
      const remove = vi
        .spyOn(target, 'removeEventListener')
        .mockImplementation((event, ...args) => {
          nativeRemove(event, ...args)
          throw event === 'ready' ? error : new Error('later cleanup failure')
        })
      const pending = waitForEvent(options)
      target.dispatchEvent(new Event('ready'))
      await expect(pending).rejects.toBe(error)
      expect(remove).toHaveBeenCalledTimes(2)
      expect(removeAbort).toHaveBeenCalledOnce()
      expect(vi.getTimerCount()).toBe(0)
      controller.abort()
      target.dispatchEvent(new Event('failure'))
      expect(reason).not.toHaveBeenCalled()
    },
  )

  it('should give a cleanup exception precedence over a synchronous start exception', async () => {
    const {options, removeAbort, start, target} = createOptions()
    const cleanupError = new Error('cleanup failed')
    const nativeRemove = EventTarget.prototype.removeEventListener.bind(target)
    const remove = vi.spyOn(target, 'removeEventListener').mockImplementation((event, ...args) => {
      nativeRemove(event, ...args)
      if (event === 'ready') {
        throw cleanupError
      }
    })
    start.mockImplementation(() => {
      throw new Error('start failed')
    })
    await expect(waitForEvent(options)).rejects.toBe(cleanupError)
    expect(remove).toHaveBeenCalledTimes(2)
    expect(removeAbort).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['ready', 'failure'] as const)(
    'should release an event delivered during %s registration without starting',
    async (event) => {
      const {error, options, remove, removeAbort, start, target} = createOptions()
      const add = target.addEventListener.bind(target)
      const subscribe = vi.spyOn(target, 'addEventListener').mockImplementation((type, ...args) => {
        add(type, ...args)
        if (type === event) {
          target.dispatchEvent(new Event(event))
        }
      })
      const pending = waitForEvent(options)
      if (event === 'ready') {
        await expect(pending).resolves.toBeUndefined()
      } else {
        await expect(pending).rejects.toBe(error)
      }
      expect(start).not.toHaveBeenCalled()
      expect(subscribe).toHaveBeenCalledTimes(event === 'ready' ? 1 : 2)
      expect(remove).toHaveBeenCalledTimes(event === 'ready' ? 1 : 2)
      expect(removeAbort).not.toHaveBeenCalled()
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it.each(['ready', 'failure'] as const)(
    'should notice cancellation during %s registration before starting',
    async (stage) => {
      const {controller, options, remove, removeAbort, start, target} = createOptions()
      const add = target.addEventListener.bind(target)
      vi.spyOn(target, 'addEventListener').mockImplementation((event, ...args) => {
        add(event, ...args)
        if (event === stage) {
          controller.abort('cancelled during subscription')
        }
      })
      const pending = waitForEvent(options)
      vi.advanceTimersByTime(100)
      await expect(pending).rejects.toBe('cancelled during subscription')
      expect(start).not.toHaveBeenCalled()
      expect(remove).toHaveBeenCalledTimes(stage === 'ready' ? 1 : 2)
      expect(removeAbort).not.toHaveBeenCalled()
      expect(getEventListeners(target, 'ready')).toHaveLength(0)
      expect(getEventListeners(target, 'failure')).toHaveLength(0)
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it.each(['ready', 'failure', 'abort'] as const)(
    'should release a listener when %s registration throws after adding it',
    async (event) => {
      const {controller, error, options, remove, removeAbort, start, target} = createOptions()
      const source = event === 'abort' ? controller.signal : target
      const add = source.addEventListener.bind(source)
      vi.spyOn(source, 'addEventListener').mockImplementation((type, ...args) => {
        add(type, ...args)
        if (type === event) {
          throw error
        }
      })
      await expect(waitForEvent(options)).rejects.toBe(error)
      expect(start).not.toHaveBeenCalled()
      expect(getEventListeners(target, 'ready')).toHaveLength(0)
      expect(getEventListeners(target, 'failure')).toHaveLength(0)
      expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0)
      expect(remove).toHaveBeenCalledTimes(event === 'ready' ? 1 : 2)
      expect(removeAbort).toHaveBeenCalledTimes(event === 'abort' ? 1 : 0)
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it.each(['ready', 'failure'] as const)(
    'should preserve cancellation before a later %s registration exception',
    async (stage) => {
      const {controller, options, start, target} = createOptions()
      const cancellation = new Error('earlier cancellation')
      const setupError = new Error('later setup exception')
      const add = target.addEventListener.bind(target)
      vi.spyOn(target, 'addEventListener').mockImplementation((event, ...args) => {
        add(event, ...args)
        if (event === stage) {
          controller.abort(cancellation)
          throw setupError
        }
      })
      await expect(waitForEvent(options)).rejects.toBe(cancellation)
      expect(start).not.toHaveBeenCalled()
      expect(getEventListeners(target, 'ready')).toHaveLength(0)
      expect(getEventListeners(target, 'failure')).toHaveLength(0)
      expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0)
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('should notice cancellation immediately before the abort listener is registered', async () => {
    const {controller, options, start, target} = createOptions()
    const add = controller.signal.addEventListener.bind(controller.signal)
    const cancellation = new Error('cancelled before abort subscription')
    vi.spyOn(controller.signal, 'addEventListener').mockImplementation((event, ...args) => {
      controller.abort(cancellation)
      add(event, ...args)
    })
    start.mockImplementation(() => target.dispatchEvent(new Event('ready')))
    await expect(waitForEvent(options)).rejects.toBe(cancellation)
    expect(start).not.toHaveBeenCalled()
    expect(getEventListeners(target, 'ready')).toHaveLength(0)
    expect(getEventListeners(target, 'failure')).toHaveLength(0)
    expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})
