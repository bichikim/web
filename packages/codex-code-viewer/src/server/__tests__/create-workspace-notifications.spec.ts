import {afterEach, describe, expect, it, vi} from 'vitest'
import {createWorkspaceNotifications} from '../create-workspace-notifications'

describe('createWorkspaceNotifications', () => {
  afterEach(() => vi.restoreAllMocks())

  it('should finish idle waits before the app deadline without changing the revision', async () => {
    const deadline = new AbortController()
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal)
    const notifications = createWorkspaceNotifications()
    notifications.watch('first')
    const received = vi.fn()
    const waiting = notifications.wait('first', 0, new AbortController().signal).then(received)
    await Promise.resolve()
    expect(received).not.toHaveBeenCalled()
    expect(timeout).toHaveBeenCalledWith(20_000)
    deadline.abort(new DOMException('Idle deadline', 'TimeoutError'))
    await waiting
    expect(received).toHaveBeenCalledWith(0)
    notifications.changed('first')
    expect(received).toHaveBeenCalledOnce()
    expect(notifications.watch('first')).toBe(1)
    notifications.close('first')
  })

  it('should still reject caller cancellation when an idle deadline exists', async () => {
    const deadline = new AbortController()
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal)
    const notifications = createWorkspaceNotifications()
    notifications.watch('first')
    const caller = new AbortController()
    const reason = new Error('Caller cancelled')
    const waiting = notifications.wait('first', 0, caller.signal)
    const rejected = expect(waiting).rejects.toBe(reason)
    caller.abort(reason)
    await rejected
    deadline.abort()
    notifications.close('first')
  })

  it('should wait for a change and retain changes between requests', async () => {
    const notifications = createWorkspaceNotifications()
    expect(notifications.watch('first')).toBe(0)
    const received = vi.fn()
    const waiting = notifications.wait('first', 0, new AbortController().signal).then(received)
    await Promise.resolve()
    expect(received).not.toHaveBeenCalled()
    notifications.changed('first')
    await waiting
    expect(received).toHaveBeenCalledWith(1)
    notifications.changed('first')
    expect(await notifications.wait('first', 1, new AbortController().signal)).toBe(2)
    notifications.close('first')
  })

  it('should wake only listeners belonging to the changed session', async () => {
    const notifications = createWorkspaceNotifications()
    notifications.watch('first')
    notifications.watch('second')
    const received = vi.fn()
    const first = notifications.wait('first', 0, new AbortController().signal)
    const second = notifications.wait('second', 0, new AbortController().signal).then(received)
    notifications.changed('first')
    expect(await first).toBe(1)
    expect(received).not.toHaveBeenCalled()
    notifications.changed('second')
    await second
    expect(received).toHaveBeenCalledWith(1)
    notifications.close('first')
    notifications.close('second')
  })

  it('should release a cancelled wait without removing other subscribers', async () => {
    const notifications = createWorkspaceNotifications()
    notifications.watch('first')
    const controller = new AbortController()
    const error = new Error('cancelled')
    const cancelled = notifications.wait('first', 0, controller.signal)
    const rejected = expect(cancelled).rejects.toBe(error)
    controller.abort(error)
    await rejected
    const waiting = notifications.wait('first', 0, new AbortController().signal)
    notifications.changed('first')
    expect(await waiting).toBe(1)
    notifications.close('first')
  })

  it('should reject outstanding waits when their session closes', async () => {
    const notifications = createWorkspaceNotifications()
    notifications.watch('first')
    const waiting = notifications.wait('first', 0, new AbortController().signal)
    const rejected = expect(waiting).rejects.toThrow('Workspace session expired')
    notifications.close('first')
    await rejected
    await expect(notifications.wait('first', 0, new AbortController().signal)).rejects.toThrow(
      'Workspace session expired',
    )
  })
})
