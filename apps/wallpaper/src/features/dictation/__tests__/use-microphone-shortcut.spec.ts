/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import flushPromises from 'flush-promises'
import {isTauri} from '@tauri-apps/api/core'
import {getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow'
import {useMicrophoneShortcut} from '../use-microphone-shortcut'

vi.mock('@tauri-apps/api/core', () => ({isTauri: vi.fn()}))
vi.mock('@tauri-apps/api/webviewWindow', () => ({getCurrentWebviewWindow: vi.fn()}))
afterEach(() => vi.resetAllMocks())

it('should toggle only the enabled foreground composer and release the listener', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  let receive: () => void = () => undefined
  const stop = vi.fn()
  const listen = vi.fn(async (_event: string, handler: () => void) => {
    receive = handler
    return stop
  })
  vi.mocked(getCurrentWebviewWindow).mockReturnValue({listen} as unknown as ReturnType<
    typeof getCurrentWebviewWindow
  >)
  const [enabled, setEnabled] = createSignal(false)
  const onToggle = vi.fn()
  const hook = renderHook(() => useMicrophoneShortcut({enabled, onToggle}))
  await flushPromises()
  receive()
  expect(onToggle).not.toHaveBeenCalled()
  setEnabled(true)
  receive()
  expect(onToggle).toHaveBeenCalledOnce()
  setEnabled(false)
  receive()
  expect(onToggle).toHaveBeenCalledOnce()
  hook.cleanup()
  expect(stop).toHaveBeenCalledOnce()
  receive()
  expect(onToggle).toHaveBeenCalledOnce()
})

it('should remove a late subscription after disposal and skip native access in the browser', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const browser = renderHook(() => useMicrophoneShortcut({enabled: () => true, onToggle: vi.fn()}))
  expect(getCurrentWebviewWindow).not.toHaveBeenCalled()
  browser.cleanup()
  vi.mocked(isTauri).mockReturnValue(true)
  const subscription = Promise.withResolvers<() => void>()
  const listen = vi.fn(() => subscription.promise)
  vi.mocked(getCurrentWebviewWindow).mockReturnValue({listen} as unknown as ReturnType<
    typeof getCurrentWebviewWindow
  >)
  const hook = renderHook(() => useMicrophoneShortcut({enabled: () => true, onToggle: vi.fn()}))
  hook.cleanup()
  const stop = vi.fn()
  subscription.resolve(stop)
  await flushPromises()
  expect(stop).toHaveBeenCalledOnce()
})
