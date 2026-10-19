/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import {useSpeechTarget} from '../use-speech-target'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
vi.mock('@tauri-apps/api/event', () => ({listen: vi.fn()}))
afterEach(() => vi.clearAllMocks())

it('should retain a newer character position while the initial native read is pending', async () => {
  let complete: (value: unknown) => void = () => undefined
  const pending = new Promise((resolve) => {
    complete = resolve
  })
  const unsubscribe = vi.fn()
  vi.mocked(isTauri).mockReturnValue(true)
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
