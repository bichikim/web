import {createRoot, createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {ViewerPort} from '../types'
import {useWorkspaceUpdates} from '../use-workspace-updates'

const session = {session: 'first', workspace: '/project'}
describe('useWorkspaceUpdates', () => {
  let dispose: () => void = () => {}
  afterEach(() => dispose())
  it('should retain changes while editing or loading and refresh once when unblocked', async () => {
    const listeners: (() => void)[] = []
    const stop = vi.fn(async () => {})
    const port: ViewerPort = {
      call: vi.fn(),
      context: vi.fn(),
      start: vi.fn(),
      watch: vi.fn(async (_session, receive) => {
        listeners.push(receive)
        return stop
      }),
    }
    const refresh = vi.fn(async () => {})
    const root = createRoot((cleanup) => {
      dispose = cleanup
      const [blocked, setBlocked] = createSignal(true)
      const revision = useWorkspaceUpdates({
        blocked,
        port,
        refresh,
        report: vi.fn(),
        session: () => session,
      })
      return {revision, setBlocked}
    })
    listeners[0]()
    listeners[0]()
    expect(root.revision()).toBe(2)
    expect(refresh).not.toHaveBeenCalled()
    root.setBlocked(false)
    expect(refresh).toHaveBeenCalledOnce()
    await Promise.resolve()
    dispose()
    expect(stop).toHaveBeenCalledOnce()
    listeners[0]()
    expect(root.revision()).toBe(2)
  })
  it('should release a subscription that finishes after the session changes', async () => {
    const subscribed = Promise.withResolvers<() => Promise<void>>()
    const stop = vi.fn(async () => {})
    const port: ViewerPort = {
      call: vi.fn(),
      context: vi.fn(),
      start: vi.fn(),
      watch: vi.fn(() => subscribed.promise),
    }
    const report = vi.fn()
    const change = createRoot((cleanup) => {
      dispose = cleanup
      const [current, setCurrent] = createSignal<typeof session | null>(session)
      useWorkspaceUpdates({blocked: () => false, port, refresh: vi.fn(), report, session: current})
      return setCurrent
    })
    change(null)
    subscribed.resolve(stop)
    await subscribed.promise
    await Promise.resolve()
    expect(stop).toHaveBeenCalledOnce()
    expect(report).not.toHaveBeenCalled()
  })
})
