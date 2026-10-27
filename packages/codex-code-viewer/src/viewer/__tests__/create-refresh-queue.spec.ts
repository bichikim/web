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

  it('should reject failed callers without waiting for the queued refresh to finish', async () => {
    const first = Promise.withResolvers<void>()
    const followUp = Promise.withResolvers<void>()
    const error = new Error('failed')
    const task = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(followUp.promise)
    const refresh = createRefreshQueue(task)
    const pending = refresh()
    let settled = false
    const result = pending.then(
      () => {
        settled = true
      },
      (failure) => {
        settled = true
        return failure
      },
    )
    expect(refresh()).toBe(pending)
    expect(refresh()).toBe(pending)
    first.reject(error)
    await first.promise.catch(() => undefined)
    await Promise.resolve()
    await Promise.resolve()
    expect(task).toHaveBeenCalledTimes(2)
    expect(settled).toBe(true)
    expect(await result).toBe(error)
    followUp.resolve()
    await followUp.promise
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('should retain late requests during a follow-up after failure', async () => {
    const first = Promise.withResolvers<void>()
    const followUp = Promise.withResolvers<void>()
    const error = new Error('failed')
    const task = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(followUp.promise)
      .mockResolvedValue(undefined)
    const refresh = createRefreshQueue(task)
    const pending = refresh()
    const rejected = expect(pending).rejects.toBe(error)
    expect(refresh()).toBe(pending)
    first.reject(error)
    await first.promise.catch(() => undefined)
    expect(task).toHaveBeenCalledTimes(2)
    const late = refresh()
    expect(late).not.toBe(pending)
    expect(refresh()).toBe(late)
    followUp.resolve()
    await rejected
    await late
    expect(task).toHaveBeenCalledTimes(3)
    await refresh()
    expect(task).toHaveBeenCalledTimes(4)
  })

  it('should preserve the first error when the explicitly queued follow-up also fails without retrying', async () => {
    const first = Promise.withResolvers<void>()
    const error = new Error('first failed')
    const task = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockRejectedValue(new Error('follow-up failed'))
    const refresh = createRefreshQueue(task)
    const pending = refresh()
    const rejected = expect(pending).rejects.toBe(error)
    expect(refresh()).toBe(pending)
    first.reject(error)
    await rejected
    await Promise.resolve()
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('should share the active promise with a request made synchronously inside refresh', async () => {
    const first = Promise.withResolvers<void>()
    let reentrant: Promise<void> | undefined
    const task = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(() => {
        reentrant = refresh()
        return first.promise
      })
      .mockResolvedValue(undefined)
    const refresh = createRefreshQueue(task)
    const pending = refresh()
    expect(reentrant).toBe(pending)
    expect(task).toHaveBeenCalledOnce()
    first.resolve()
    await pending
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('should release the queue after a synchronous throw without an automatic retry', async () => {
    const error = new Error('synchronous failure')
    const task = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(() => {
        throw error
      })
      .mockResolvedValue(undefined)
    const refresh = createRefreshQueue(task)
    await expect(refresh()).rejects.toBe(error)
    expect(task).toHaveBeenCalledOnce()
    await refresh()
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('should propagate an undefined rejection while retaining queued work', async () => {
    const first = Promise.withResolvers<void>()
    const task = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined)
    const refresh = createRefreshQueue(task)
    const pending = refresh()
    const rejected = expect(pending).rejects.toBeUndefined()
    expect(refresh()).toBe(pending)
    first.reject(undefined)
    await rejected
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('should retain synchronous reentrant requests when the follow-up throws', async () => {
    const first = Promise.withResolvers<void>()
    const firstError = new Error('first failure')
    const nextError = new Error('follow-up failure')
    let reentrant: Promise<void> | undefined
    const task = vi
      .fn<() => Promise<void>>()
      .mockReturnValueOnce(first.promise)
      .mockImplementationOnce(() => {
        reentrant = refresh()
        throw nextError
      })
      .mockResolvedValue(undefined)
    const refresh = createRefreshQueue(task)
    const pending = refresh()
    const rejected = expect(pending).rejects.toBe(firstError)
    expect(refresh()).toBe(pending)
    first.reject(firstError)
    await rejected
    expect(reentrant).not.toBe(pending)
    await expect(reentrant).rejects.toBe(nextError)
    await Promise.resolve()
    expect(task).toHaveBeenCalledTimes(3)
  })
})
