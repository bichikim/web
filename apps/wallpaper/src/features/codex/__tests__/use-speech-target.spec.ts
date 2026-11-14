/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import {clearMocks, mockWindows} from '@tauri-apps/api/mocks'
import {WebviewWindow} from '@tauri-apps/api/webviewWindow'
import {useSpeechTarget} from '../use-speech-target'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
vi.mock('@tauri-apps/api/event', () => ({listen: vi.fn()}))
beforeEach(() => {
  vi.spyOn(WebviewWindow.prototype, 'listen').mockImplementation(listen)
})
afterEach(() => {
  clearMocks()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

it('should subscribe separately to each speech window instead of receiving other widgets positions', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(listen).mockResolvedValue(vi.fn())
  vi.mocked(invoke).mockResolvedValue(null)
  mockWindows('poffo-bubble-first')
  const first = renderHook(useSpeechTarget)
  mockWindows('poffo-bubble-second')
  const second = renderHook(useSpeechTarget)
  await Promise.resolve()
  expect(vi.mocked(WebviewWindow.prototype.listen).mock.contexts).toEqual([
    expect.objectContaining({label: 'poffo-bubble-first'}),
    expect.objectContaining({label: 'poffo-bubble-second'}),
  ])
  const receive = vi.mocked(listen).mock.calls[0][1]
  receive({event: 'poffo-speech-target', id: 1, payload: {x: 300, y: 210}})
  expect(first.result()).toEqual({x: 300, y: 210})
  expect(second.result()).toBeUndefined()
  first.cleanup()
  second.cleanup()
})

it('should retain a newer character position while the initial native read is pending', async () => {
  let complete: (value: unknown) => void = () => undefined
  const pending = new Promise((resolve) => {
    complete = resolve
  })
  const unsubscribe = vi.fn()
  vi.mocked(isTauri).mockReturnValue(true)
  mockWindows('poffo-bubble-widget')
  vi.mocked(listen).mockResolvedValue(unsubscribe)
  vi.mocked(invoke).mockReturnValue(pending)
  const {result, cleanup} = renderHook(useSpeechTarget)
  await Promise.resolve()
  const receive = vi.mocked(listen).mock.calls[0][1]
  receive({event: 'poffo-speech-target', id: 1, payload: {maxHeight: 480, x: 300, y: 210}})
  complete({maxHeight: 640, x: 10, y: 20})
  await Promise.resolve()
  expect(result()).toEqual({maxHeight: 480, x: 300, y: 210})
  cleanup()
  expect(unsubscribe).toHaveBeenCalledOnce()
})

it('should not access native window coordinates outside the desktop host', () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const {result, cleanup} = renderHook(useSpeechTarget)
  expect(result()).toBeUndefined()
  expect(listen).not.toHaveBeenCalled()
  expect(invoke).not.toHaveBeenCalled()
  cleanup()
})
