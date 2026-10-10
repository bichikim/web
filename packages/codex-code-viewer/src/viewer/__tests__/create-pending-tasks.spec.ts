import {describe, expect, it, vi} from 'vitest'
import {createPendingTasks} from '../create-pending-tasks'

describe('createPendingTasks', () => {
  it('should wait for follow-up cleanup added when an earlier operation finishes', async () => {
    const tasks = createPendingTasks()
    const operation = Promise.withResolvers<void>()
    const cleanup = Promise.withResolvers<void>()
    const finished = vi.fn()
    const first = tasks.run(() => operation.promise)
    first.then(() => tasks.run(() => cleanup.promise))
    const draining = tasks.settle().then(finished)
    operation.resolve()
    await first
    await Promise.resolve()
    expect(finished).not.toHaveBeenCalled()
    cleanup.resolve()
    await draining
    expect(finished).toHaveBeenCalledOnce()
  })

  it('should release rejected work while preserving the caller error', async () => {
    const tasks = createPendingTasks()
    const error = new Error('failure')
    await expect(
      tasks.run(async () => {
        throw error
      }),
    ).rejects.toBe(error)
    await tasks.settle()
  })
})
