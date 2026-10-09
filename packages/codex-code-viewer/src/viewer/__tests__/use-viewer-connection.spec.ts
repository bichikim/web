import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import type {ViewerSession} from '../../shared/contracts'
import type {ViewerPort} from '../types'
import {useViewerConnection} from '../use-viewer-connection'

const initial: ViewerSession = {
  document: {
    lines: [[]],
    location: {column: 1, line: 1, path: 'main.tsx'},
    revision: '',
    source: '',
  },
  session: 'session',
  workspace: '/project',
}

describe('useViewerConnection', () => {
  it('should keep the session available when host teardown is cancelled and allow a later close', async () => {
    const decision = Promise.withResolvers<boolean>()
    const handlers: {teardown?: () => Promise<void>; refresh?: () => void} = {}
    const refresh = vi.fn()
    const disposePort = vi.fn()
    const beforeClose = vi.fn().mockReturnValueOnce(decision.promise).mockResolvedValue(true)
    const port: ViewerPort = {
      call: vi.fn(async () => ({content: []})),
      context: async () => {},
      start: async (_receive, _report, onRefresh, teardown) => {
        handlers.refresh = onRefresh
        handlers.teardown = teardown
        return disposePort
      },
    }
    const dispose = createRoot((dispose) => {
      useViewerConnection({
        beforeClose,
        port,
        receive: vi.fn(),
        refresh,
        report: vi.fn(),
        session: () => initial,
      })
      return dispose
    })
    await Promise.resolve()
    const closing = handlers.teardown!()
    const rejected = expect(closing).rejects.toThrow('미저장 변경으로 종료를 취소했습니다.')
    expect(port.call).not.toHaveBeenCalled()
    decision.resolve(false)
    await rejected
    handlers.refresh!()
    expect(refresh).toHaveBeenCalledOnce()
    expect(port.call).not.toHaveBeenCalled()
    expect(disposePort).not.toHaveBeenCalled()
    await handlers.teardown!()
    expect(port.call).toHaveBeenCalledWith('code.close', {session: 'session'})
    dispose()
  })
  it('should finish closing the session on host teardown before the transport is unmounted', async () => {
    const closed = Promise.withResolvers<{content: []}>()
    const disposed = Promise.withResolvers<void>()
    const handlers: {teardown?: () => Promise<void>} = {}
    const disposePort = vi.fn(disposed.resolve)
    const port: ViewerPort = {
      call: vi.fn(() => closed.promise),
      context: async () => {},
      start: async (_receive, _report, _refresh, teardown) => {
        handlers.teardown = teardown
        return disposePort
      },
    }
    const root = createRoot((dispose) => {
      useViewerConnection({
        port,
        receive: vi.fn(),
        refresh: vi.fn(),
        report: vi.fn(),
        session: () => initial,
      })
      return {dispose}
    })
    await Promise.resolve()
    const teardown = handlers.teardown?.()
    await Promise.resolve()
    expect(port.call).toHaveBeenCalledWith('code.close', {session: 'session'})
    expect(disposePort).not.toHaveBeenCalled()
    closed.resolve({content: []})
    await teardown
    expect(disposePort).not.toHaveBeenCalled()
    root.dispose()
    await disposed.promise
    expect(port.call).toHaveBeenCalledOnce()
    expect(disposePort).toHaveBeenCalledOnce()
  })
  it('should close a late session instead of delivering it after unmount', async () => {
    const started = Promise.withResolvers<() => void>()
    const disposed = Promise.withResolvers<void>()
    const disposePort = vi.fn(disposed.resolve)
    const receive = vi.fn()
    const handlers: {receive?: (session: ViewerSession) => void} = {}
    const port: ViewerPort = {
      call: vi.fn(async () => ({content: []})),
      context: async () => {},
      start: (callback) => {
        handlers.receive = callback
        return started.promise
      },
    }
    createRoot((dispose) => {
      useViewerConnection({port, receive, refresh: vi.fn(), report: vi.fn(), session: () => null})
      dispose()
    })
    handlers.receive?.(initial)
    started.resolve(disposePort)
    await started.promise
    await disposed.promise
    expect(receive).not.toHaveBeenCalled()
    expect(port.call).toHaveBeenCalledWith('code.close', {session: 'session'})
    expect(disposePort).toHaveBeenCalledOnce()
  })

  it('should finish closing the current session before disposing a late port connection', async () => {
    const started = Promise.withResolvers<() => void>()
    const closing = Promise.withResolvers<{content: []}>()
    const disposed = Promise.withResolvers<void>()
    const disposePort = vi.fn(disposed.resolve)
    const port: ViewerPort = {
      call: vi.fn(() => closing.promise),
      context: async () => {},
      start: () => started.promise,
    }
    createRoot((dispose) => {
      useViewerConnection({
        port,
        receive: vi.fn(),
        refresh: vi.fn(),
        report: vi.fn(),
        session: () => initial,
      })
      dispose()
    })
    started.resolve(disposePort)
    await started.promise
    await Promise.resolve()
    expect(disposePort).not.toHaveBeenCalled()
    closing.resolve({content: []})
    await disposed.promise
    expect(disposePort).toHaveBeenCalledOnce()
  })
})
