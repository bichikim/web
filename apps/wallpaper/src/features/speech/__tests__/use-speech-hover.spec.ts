/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow'
import {useSpeechHover} from '../use-speech-hover'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
vi.mock('@tauri-apps/api/webviewWindow', () => ({getCurrentWebviewWindow: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})
const mount = () =>
  renderHook(() =>
    useSpeechHover({
      element: () => document.createElement('div'),
      onLeave: vi.fn(),
      onMove: vi.fn(),
    }),
  )
const listenLater = () => {
  const listener = Promise.withResolvers<() => void>()
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue(undefined)
  vi.mocked(getCurrentWebviewWindow).mockReturnValue({
    listen: vi.fn().mockReturnValue(listener.promise),
  } as unknown as ReturnType<typeof getCurrentWebviewWindow>)
  return listener
}

it('should release a late listener without enabling a disposed subscription', async () => {
  const listener = listenLater()
  const stop = vi.fn()
  const view = mount()
  view.cleanup()
  listener.resolve(stop)
  await listener.promise
  await Promise.resolve()
  expect(stop).toHaveBeenCalledOnce()
  expect(invoke).not.toHaveBeenCalledWith(
    'subscribe_poffo_cursor',
    expect.objectContaining({enabled: true}),
  )
})

it('should disable again when a pending native enable completes after disposal', async () => {
  const listener = listenLater()
  const enabled = Promise.withResolvers<void>()
  vi.mocked(invoke).mockReturnValueOnce(enabled.promise)
  const view = mount()
  listener.resolve(vi.fn<() => void>())
  await listener.promise
  await Promise.resolve()
  expect(invoke).toHaveBeenCalledWith(
    'subscribe_poffo_cursor',
    expect.objectContaining({enabled: true}),
  )
  view.cleanup()
  enabled.resolve()
  await enabled.promise
  await Promise.resolve()
  expect(invoke).toHaveBeenCalledTimes(3)
  expect(invoke).toHaveBeenLastCalledWith(
    'subscribe_poffo_cursor',
    expect.objectContaining({enabled: false}),
  )
})

it('should report native listener failures without leaving an unhandled rejection', async () => {
  const listener = listenLater()
  const report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const failure = new Error('listen failed')
  mount()
  listener.reject(failure)
  await Promise.resolve()
  await Promise.resolve()
  expect(report).toHaveBeenCalledWith('Poffo speech hover unavailable', failure)
})

it('should retain DOM hover as the only input in browser previews', () => {
  vi.mocked(isTauri).mockReturnValue(false)
  mount()
  expect(getCurrentWebviewWindow).not.toHaveBeenCalled()
  expect(invoke).not.toHaveBeenCalled()
})
