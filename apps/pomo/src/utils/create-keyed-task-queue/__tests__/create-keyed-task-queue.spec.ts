import {describe, expect, it, vi} from 'vitest'
import {createKeyedTaskQueue} from '..'

describe('createKeyedTaskQueue', () => {
  it('should keep keys independent and continue the same key after failure', async () => {
    const queue = createKeyedTaskQueue()
    const first = Promise.withResolvers<void>()
    const failure = new Error('first failed')
    const followup = vi.fn(async () => 'next')
    const running = queue.run('one', () => first.promise)
    const rejected = expect(running).rejects.toBe(failure)
    const next = queue.run('one', followup)
    await expect(queue.run('two', async () => 'independent')).resolves.toBe('independent')
    expect(followup).not.toHaveBeenCalled()
    first.reject(failure)
    await rejected
    await expect(next).resolves.toBe('next')
    await expect(queue.run('one', async () => 'reused')).resolves.toBe('reused')
  })

  it('should retain later queued work when an earlier operation completes', async () => {
    const queue = createKeyedTaskQueue()
    const first = Promise.withResolvers<void>()
    const second = Promise.withResolvers<void>()
    const secondStarted = Promise.withResolvers<void>()
    const third = vi.fn(async () => undefined)
    const firstResult = queue.run('one', () => first.promise)
    const secondResult = queue.run('one', () => {
      secondStarted.resolve()
      return second.promise
    })
    first.resolve()
    await firstResult
    await secondStarted.promise
    const thirdResult = queue.run('one', third)
    await Promise.resolve()
    expect(third).not.toHaveBeenCalled()
    second.resolve()
    await Promise.all([secondResult, thirdResult])
    expect(third).toHaveBeenCalledOnce()
  })
})
