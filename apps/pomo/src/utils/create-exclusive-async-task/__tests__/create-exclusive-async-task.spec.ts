import {describe, expect, it, vi} from 'vitest'
import {createExclusiveAsyncTask} from '..'

describe('createExclusiveAsyncTask', () => {
  it('should drop overlapping work and allow a later request after completion', async () => {
    const task = createExclusiveAsyncTask()
    const first = Promise.withResolvers<void>()
    const operation = vi.fn(() => first.promise)

    const running = task.run(operation)
    await expect(task.run(operation)).resolves.toEqual({reason: 'busy', status: 'skipped'})
    expect(operation).toHaveBeenCalledTimes(1)
    first.resolve()
    await expect(running).resolves.toEqual({status: 'completed'})
    await expect(task.run(operation)).resolves.toEqual({status: 'completed'})
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('should release the exclusive slot after a failure', async () => {
    const task = createExclusiveAsyncTask()
    await expect(task.run(async () => Promise.reject(new Error('failed')))).rejects.toThrow(
      'failed',
    )
    await expect(task.run(async () => undefined)).resolves.toEqual({status: 'completed'})
  })

  it('should release the slot after a synchronous exception', async () => {
    const task = createExclusiveAsyncTask()
    await expect(
      task.run(() => {
        throw new Error('failed')
      }),
    ).rejects.toThrow('failed')
    await expect(task.run(async () => undefined)).resolves.toEqual({status: 'completed'})
  })
})
