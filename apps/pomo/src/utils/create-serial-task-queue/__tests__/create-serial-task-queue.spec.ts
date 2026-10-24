import {describe, expect, expectTypeOf, it, vi} from 'vitest'
import {createSerialTaskQueue} from '../create-serial-task-queue'

describe('createSerialTaskQueue', () => {
  it('should preserve ordering after a failed operation and settle every queued task', async () => {
    const queue = createSerialTaskQueue()
    const blocked = Promise.withResolvers<void>()
    const failure = new Error('write failed')
    const second = vi.fn(async () => 'saved')
    const firstResult = queue.run(() => blocked.promise)
    const rejection = expect(firstResult).rejects.toBe(failure)
    const secondResult = queue.run(second)
    expectTypeOf(secondResult).toEqualTypeOf<Promise<string>>()
    await Promise.resolve()
    expect(second).not.toHaveBeenCalled()
    blocked.reject(failure)
    await rejection
    await expect(secondResult).resolves.toBe('saved')
    await queue.settle()
    expect(second).toHaveBeenCalledOnce()
  })

  it('should not block an independent queue', async () => {
    const blocked = Promise.withResolvers<void>()
    const first = createSerialTaskQueue().run(() => blocked.promise)
    await expect(createSerialTaskQueue().run(async () => 'independent')).resolves.toBe(
      'independent',
    )
    blocked.resolve()
    await first
  })

  it('should settle only the work submitted before the settle call', async () => {
    const queue = createSerialTaskQueue()
    const first = Promise.withResolvers<void>()
    const later = Promise.withResolvers<void>()
    let settled = false
    let laterFinished = false
    const firstResult = queue.run(() => first.promise)
    const completion = queue.settle().then(() => {
      settled = true
    })
    const laterResult = queue.run(async () => {
      await later.promise
      laterFinished = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)
    first.resolve()
    await completion
    expect(laterFinished).toBe(false)
    later.resolve()
    await Promise.all([firstResult, laterResult, queue.settle()])
    expect(laterFinished).toBe(true)
  })

  it('should settle after a synchronous failure without rejecting and allow later work', async () => {
    const queue = createSerialTaskQueue()
    const failure = new Error('failed')
    const result = queue.run(() => {
      throw failure
    })
    const completion = queue.settle()
    await expect(result).rejects.toBe(failure)
    await expect(completion).resolves.toBeUndefined()
    await expect(queue.run(async () => 42)).resolves.toBe(42)
  })

  it('should settle an empty queue', async () => {
    await expect(createSerialTaskQueue().settle()).resolves.toBeUndefined()
  })
})
