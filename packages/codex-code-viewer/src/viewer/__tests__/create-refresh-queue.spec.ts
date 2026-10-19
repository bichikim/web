import {describe, expect, it, vi} from 'vitest'
import {createRefreshQueue} from '../create-refresh-queue'

describe('createRefreshQueue', () => {
  it('should merge concurrent requests and run once more for changes received during a refresh', async () => {
    const first = Promise.withResolvers<void>()
    const task = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined)
    const refresh = createRefreshQueue(task)
    const pending = refresh()
    expect(refresh()).toBe(pending)
    await Promise.resolve()
    expect(task).toHaveBeenCalledOnce()
    expect(refresh()).toBe(pending)
    refresh()
    first.resolve()
    await pending
    expect(task).toHaveBeenCalledTimes(2)
    await refresh()
    expect(task).toHaveBeenCalledTimes(3)
  })
  it('should allow a subsequent refresh after a failed request', async () => {
    const task = vi.fn().mockRejectedValueOnce(new Error('failed')).mockResolvedValue(undefined)
    const refresh = createRefreshQueue(task)
    await expect(refresh()).rejects.toThrow('failed')
    await refresh()
    expect(task).toHaveBeenCalledTimes(2)
  })
})
