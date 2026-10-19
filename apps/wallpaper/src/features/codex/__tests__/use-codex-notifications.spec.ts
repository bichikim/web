/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {useCodexNotifications} from '../use-codex-notifications'
import type {CodexPort, CodexSnapshot} from '../types'

const disconnected: CodexSnapshot = {
  activity: null,
  received: false,
  recent: [],
  registered: false,
  sessions: [],
}
const registered: CodexSnapshot = {...disconnected, registered: true}
const received: CodexSnapshot = {
  ...registered,
  activity: {
    notificationId: 1,
    phase: 'working',
    receivedAt: 1,
    sessionId: 'session',
    text: '작업 중이에요.',
    tool: null,
  },
  received: true,
}
const fixture = (overrides: Partial<CodexPort> = {}) => {
  let receive: (value: CodexSnapshot) => void = () => undefined
  const unsubscribe = vi.fn()
  const port: CodexPort = {
    available: true,
    connect: vi.fn(async () => registered),
    disconnect: vi.fn(async () => disconnected),
    read: vi.fn(async () => disconnected),
    subscribe: vi.fn(async (listener) => {
      receive = listener
      return unsubscribe
    }),
    ...overrides,
  }
  return {port, receive: (value: CodexSnapshot) => receive(value), unsubscribe}
}

it('should wait for a received event after registration and disconnect independently', async () => {
  const source = fixture()
  const {result, cleanup} = renderHook(() => useCodexNotifications(source.port))
  await result.connect()
  expect(result.snapshot()).toEqual(registered)
  source.receive(received)
  expect(result.snapshot()).toEqual(received)
  await result.disconnect()
  expect(result.snapshot()).toEqual(disconnected)
  expect(source.port.connect).toHaveBeenCalledOnce()
  expect(source.port.disconnect).toHaveBeenCalledOnce()
  cleanup()
  expect(source.unsubscribe).toHaveBeenCalledOnce()
})

it('should keep an event arriving while the initial snapshot is pending', async () => {
  let resolveRead: (value: CodexSnapshot) => void = () => undefined
  const source = fixture({
    read: vi.fn(
      () =>
        new Promise<CodexSnapshot>((resolve) => {
          resolveRead = resolve
        }),
    ),
  })
  const {result, cleanup} = renderHook(() => useCodexNotifications(source.port))
  await Promise.resolve()
  source.receive(received)
  resolveRead(disconnected)
  await Promise.resolve()
  expect(result.snapshot()).toEqual(received)
  cleanup()
  source.receive(disconnected)
  expect(result.snapshot()).toEqual(received)
})

it('should retain the last snapshot and expose a connection error without staying busy', async () => {
  const source = fixture({
    connect: vi.fn(async () => {
      throw new Error('hooks changed')
    }),
  })
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const {result, cleanup} = renderHook(() => useCodexNotifications(source.port))
  await result.connect()
  expect(result.busy()).toBe(false)
  expect(result.error()).toBe('Codex 알림 연결을 확인해 주세요.')
  expect(result.snapshot()).toEqual(disconnected)
  cleanup()
  log.mockRestore()
})

it('should keep a dismissed notification hidden during progress and reveal the next message', async () => {
  const pending = Promise.withResolvers<CodexSnapshot>()
  const source = fixture({dismiss: vi.fn(() => pending.promise)})
  const {result, cleanup} = renderHook(() => useCodexNotifications(source.port))
  await Promise.resolve()
  const activity = received.activity!
  source.receive({...received, sessions: [activity]})
  const close = result.dismiss!(activity)
  expect(result.snapshot().sessions).toEqual([])
  source.receive({...received, sessions: [{...activity, tool: 'read_file'}]})
  expect(result.snapshot().sessions).toEqual([])
  const next = {...activity, notificationId: 2, phase: 'response' as const, response: '새 응답'}
  source.receive({...received, sessions: [next]})
  pending.resolve({...received, sessions: []})
  await close
  expect(result.snapshot().sessions).toEqual([next])
  expect(source.port.dismiss).toHaveBeenCalledWith('session', 1)
  cleanup()
})

it('should restore a failed dismissal without discarding newer activity from another chat', async () => {
  const pending = Promise.withResolvers<CodexSnapshot>()
  const source = fixture({dismiss: vi.fn(() => pending.promise)})
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const {result, cleanup} = renderHook(() => useCodexNotifications(source.port))
  await Promise.resolve()
  const activity = received.activity!
  source.receive({...received, sessions: [activity]})
  const close = result.dismiss!(activity)
  const other = {...activity, notificationId: 2, sessionId: 'other'}
  source.receive({...received, sessions: [activity, other]})
  pending.reject(new Error('unavailable'))
  await close
  expect(result.snapshot().sessions).toEqual([activity, other])
  cleanup()
  log.mockRestore()
})
