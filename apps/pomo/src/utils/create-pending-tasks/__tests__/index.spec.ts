/** @vitest-environment node */
import {describe, expect, expectTypeOf, it, vi} from 'vitest'
import {createPendingTasks} from '..'

describe('createPendingTasks', () => {
  it('should settle an empty snapshot without retaining work', async () => {
    const tasks = createPendingTasks()
    expect(tasks.hasPending()).toBe(false)
    await expect(tasks.settle()).resolves.toBeUndefined()
    expect(tasks.hasPending()).toBe(false)
  })

  it('should return the original promise and release successful work before its observers', async () => {
    const source = Promise.withResolvers<{value: number}>()
    const tasks = createPendingTasks()
    const tracked = tasks.track(source.promise)
    expect(tracked).toBe(source.promise)
    expectTypeOf(tracked).toEqualTypeOf<Promise<{value: number}>>()
    expect(tasks.hasPending()).toBe(true)
    const observed = tracked.then((value) => {
      expect(tasks.hasPending()).toBe(false)
      return value
    })
    const value = {value: 1}
    source.resolve(value)
    expect(await observed).toBe(value)
    await expect(tasks.settle()).resolves.toBeUndefined()
  })

  it('should preserve the original rejection while settlement fulfills', async () => {
    const source = Promise.withResolvers<void>()
    const tasks = createPendingTasks()
    const tracked = tasks.track(source.promise)
    const reason = {code: 'unavailable'}
    const rejected = expect(tracked).rejects.toBe(reason)
    const settled = tasks.settle()
    expect(tracked).toBe(source.promise)
    source.reject(reason)
    await rejected
    await expect(settled).resolves.toBeUndefined()
    expect(tasks.hasPending()).toBe(false)
  })

  it('should wait for every task in a parallel snapshot even after one rejects', async () => {
    const first = Promise.withResolvers<void>()
    const second = Promise.withResolvers<void>()
    const tasks = createPendingTasks()
    tasks.track(first.promise)
    tasks.track(second.promise)
    const complete = vi.fn()
    const settling = tasks.settle().then(complete)
    first.reject(new Error('failed'))
    await first.promise.catch(() => undefined)
    expect(complete).not.toHaveBeenCalled()
    expect(tasks.hasPending()).toBe(true)
    second.resolve()
    await settling
    expect(complete).toHaveBeenCalledOnce()
    expect(tasks.hasPending()).toBe(false)
  })

  it('should exclude tasks registered after the settlement snapshot', async () => {
    const first = Promise.withResolvers<void>()
    const later = Promise.withResolvers<void>()
    const tasks = createPendingTasks()
    tasks.track(first.promise)
    const settling = tasks.settle()
    tasks.track(later.promise)
    first.resolve()
    await settling
    expect(tasks.hasPending()).toBe(true)
    later.resolve()
    await tasks.settle()
    expect(tasks.hasPending()).toBe(false)
  })

  it('should exclude work added by a completion observer from an existing snapshot', async () => {
    const first = Promise.withResolvers<void>()
    const later = Promise.withResolvers<void>()
    const tasks = createPendingTasks()
    tasks.track(first.promise)
    const observing = first.promise.then(() => tasks.track(later.promise))
    const settling = tasks.settle()
    first.resolve()
    await settling
    expect(tasks.hasPending()).toBe(true)
    later.resolve()
    await observing
    await tasks.settle()
    expect(tasks.hasPending()).toBe(false)
  })

  it.each(['fulfilled', 'rejected'] as const)(
    'should track an already %s promise until its cleanup runs',
    async (status) => {
      const tasks = createPendingTasks()
      const reason = new Error('unavailable')
      const source = status === 'fulfilled' ? Promise.resolve(1) : Promise.reject(reason)
      expect(tasks.track(source)).toBe(source)
      expect(tasks.hasPending()).toBe(true)
      const results = await Promise.allSettled([source])
      expect(results).toEqual([status === 'fulfilled' ? {status, value: 1} : {reason, status}])
      expect(tasks.hasPending()).toBe(false)
    },
  )

  it('should retain identity and release a promise registered more than once', async () => {
    const source = Promise.withResolvers<void>()
    const tasks = createPendingTasks()
    expect(tasks.track(source.promise)).toBe(source.promise)
    expect(tasks.track(source.promise)).toBe(source.promise)
    const settling = tasks.settle()
    source.resolve()
    await settling
    expect(tasks.hasPending()).toBe(false)
  })

  it('should isolate pending work and settlement between instances', async () => {
    const first = createPendingTasks()
    const second = createPendingTasks()
    const firstGate = Promise.withResolvers<void>()
    const secondGate = Promise.withResolvers<void>()
    first.track(firstGate.promise)
    second.track(secondGate.promise)
    secondGate.resolve()
    await second.settle()
    expect(second.hasPending()).toBe(false)
    expect(first.hasPending()).toBe(true)
    firstGate.resolve()
    await first.settle()
    expect(first.hasPending()).toBe(false)
  })
})
