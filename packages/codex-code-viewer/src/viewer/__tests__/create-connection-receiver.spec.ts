import {createRoot, createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import type {ViewerConnection, ViewerSession} from '../../shared/contracts'
import {createConnectionReceiver} from '../create-connection-receiver'

const connection = (session: string, deferred = false): ViewerSession => ({
  document: {
    lines: [],
    source: deferred ? '' : 'abc',
    ...(deferred ? {sourceLength: 3} : {}),
    lineCount: 1,
    location: {column: 1, line: 1, path: 'large.txt'},
    readOnly: true,
    revision: 'v1',
  },
  session,
  workspace: '/project',
})
const mount = () =>
  createRoot((dispose) => {
    const [current, setCurrent] = createSignal<ViewerConnection | null>(connection('old'))
    const call = vi.fn(
      async (): Promise<{
        content: []
        isError?: boolean
        structuredContent?: Record<string, unknown>
      }> => ({content: []}),
    )
    const report = vi.fn()
    const onReceive = vi.fn((value: ViewerConnection) => setCurrent(value))
    const receive = createConnectionReceiver({
      confirmLeave: async () => true,
      connection: current,
      onReceive,
      pending: () => false,
      port: {call, context: vi.fn(), start: vi.fn()},
      report,
    })
    return {call, current, dispose, onReceive, receive, report}
  })
describe('createConnectionReceiver', () => {
  it('should keep the active session when a deferred source fails', async () => {
    const state = mount()
    state.call.mockResolvedValue({
      content: [],
      isError: true,
      structuredContent: {code: 'stale-document'},
    })
    try {
      await state.receive(connection('new', true))
      expect(state.current()?.session).toBe('old')
      expect(state.report).toHaveBeenCalledTimes(1)
      expect(state.call).toHaveBeenCalledWith('code.close', {session: 'new'})
      expect(state.call).not.toHaveBeenCalledWith('code.close', {session: 'old'})
    } finally {
      state.dispose()
    }
  })
  it('should release an obsolete source after the newer connection wins', async () => {
    const state = mount()
    const chunk = Promise.withResolvers<{
      content: []
      structuredContent: {data: string; next: number}
    }>()
    const started = Promise.withResolvers<void>()
    state.call.mockImplementationOnce(() => {
      started.resolve()
      return chunk.promise
    })
    try {
      const reading = state.receive(connection('loading', true))
      await started.promise
      expect(state.call).not.toHaveBeenCalledWith('code.close', {session: 'old'})
      await state.receive(connection('latest'))
      chunk.resolve({content: [], structuredContent: {data: 'abc', next: 3}})
      await reading
      expect(state.current()?.session).toBe('latest')
      expect(state.onReceive).toHaveBeenCalledTimes(1)
      expect(state.call).toHaveBeenCalledWith('code.close', {session: 'loading'})
    } finally {
      state.dispose()
    }
  })
  it('should release a pending incoming session when its owner is disposed', async () => {
    const state = mount()
    const chunk = Promise.withResolvers<{
      content: []
      structuredContent: {data: string; next: number}
    }>()
    const started = Promise.withResolvers<void>()
    state.call.mockImplementationOnce(() => {
      started.resolve()
      return chunk.promise
    })
    const reading = state.receive(connection('loading', true))
    await started.promise
    state.dispose()
    chunk.resolve({content: [], structuredContent: {data: 'abc', next: 3}})
    await reading
    expect(state.onReceive).not.toHaveBeenCalled()
    expect(state.report).not.toHaveBeenCalled()
    expect(state.call).toHaveBeenCalledWith('code.close', {session: 'loading'})
  })
})
