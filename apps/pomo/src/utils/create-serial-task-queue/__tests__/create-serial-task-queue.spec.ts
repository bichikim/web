import {expect, it, vi} from 'vitest'
import {createSerialTaskQueue} from '../create-serial-task-queue'

it('should preserve ordering after a failed operation and settle every queued task', async () => {
  const queue = createSerialTaskQueue()
  const blocked = Promise.withResolvers<void>()
  const failure = new Error('write failed')
  const second = vi.fn(async () => 'saved')
  const firstResult = queue.run(() => blocked.promise)
  const rejection = expect(firstResult).rejects.toBe(failure)
  const secondResult = queue.run(second)
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
  await expect(createSerialTaskQueue().run(async () => 'independent')).resolves.toBe('independent')
  blocked.resolve()
  await first
})
