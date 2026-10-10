import {describe, expect, it, vi} from 'vitest'
import {createWorkspaceNotifications} from '../create-workspace-notifications'

describe('createWorkspaceNotifications', () => {
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
