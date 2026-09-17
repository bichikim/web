/** @vitest-environment jsdom */

import {cleanup, render, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {createSignal, Show} from 'solid-js'

import {useScreenSaver} from '../use-screen-saver'

const native = vi.hoisted(() => ({getItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: native}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  localStorage.clear()
  Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
})

it.each(['pending', 'completed'] as const)(
  'should restore the disabled screen saver on remount with native persistence %s',
  async (phase) => {
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem('pomo:screen-saver-delay:v1', '"10m"')
    let stored = '"10m"'
    const completion = Promise.withResolvers<void>()
    native.getItem.mockImplementation(async () => stored)
    native.setItem.mockImplementation(async (_key: string, value: string) => {
      if (value === '"off"') {
        await completion.promise
      }
      stored = value
    })
    const [visible, setVisible] = createSignal(true)
    let current: ReturnType<typeof useScreenSaver>
    const Consumer = () => {
      current = useScreenSaver()
      return null
    }
    const first = render(() => (
      <PreferenceProvider>
        <Show when={visible()}>
          <Consumer />
        </Show>
      </PreferenceProvider>
    ))
    await vi.waitFor(() => expect(current.delay()).toBe('10m'))
    const webWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('storage full', 'QuotaExceededError')
    })

    current!.onDelayChange('off')
    await vi.waitFor(() =>
      expect(native.setItem).toHaveBeenCalledWith('pomo:screen-saver-delay:v1', '"off"'),
    )
    if (phase === 'completed') {
      completion.resolve()
      await vi.waitFor(() => expect(stored).toBe('"off"'))
    }
    expect(current!.delay()).toBe('off')
    setVisible(false)
    webWrite.mockRestore()
    setVisible(true)
    expect(current!.delay()).toBe('off')
    completion.resolve()
    await vi.waitFor(() => expect(stored).toBe('"off"'))
    await vi.waitFor(() => expect(localStorage.getItem('pomo:screen-saver-delay:v1')).toBeNull())
    first.unmount()
    const restored = renderHook(() => useScreenSaver(), {wrapper: PreferenceProvider})
    await vi.waitFor(() => expect(native.getItem).toHaveBeenCalled())
    await vi.waitFor(() => {
      expect(localStorage.getItem('pomo:screen-saver-delay:v1')).toBe('"off"')
      expect(restored.result.delay()).toBe('off')
    })
  },
)
