/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {useBackgroundSource} from '../use-background-source'

afterEach(() => vi.unstubAllGlobals())

test('should wait for layout and switch sources only when the host changes orientation', () => {
  let measure = () => {}
  const disconnect = vi.fn()
  const observe = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        measure = callback
      }
      disconnect = disconnect
      observe = observe
    },
  )
  const host = document.createElement('div')
  let width = 0
  let height = 0
  Object.defineProperties(host, {
    clientHeight: {get: () => height},
    clientWidth: {get: () => width},
  })
  const [landscape, setLandscape] = createSignal('profile-wide')
  const [portrait, setPortrait] = createSignal('profile-portrait')
  const [tall, setTall] = createSignal('profile-tall')
  const hook = renderHook(() => useBackgroundSource({host: () => host, landscape, portrait, tall}))
  expect(hook.result()).toBeNull()
  width = 300
  height = 700
  measure()
  expect(hook.result()).toBe('profile-tall')
  setTall('street-tall')
  expect(hook.result()).toBe('street-tall')
  width = 375
  height = 667
  measure()
  expect(hook.result()).toBe('profile-portrait')
  setPortrait('street-portrait')
  expect(hook.result()).toBe('street-portrait')
  width = 700
  height = 300
  measure()
  expect(hook.result()).toBe('profile-wide')
  setLandscape('street-wide')
  expect(hook.result()).toBe('street-wide')
  width = 300
  height = 300
  measure()
  expect(hook.result()).toBe('street-wide')
  width = 800
  height = 1200
  measure()
  expect(hook.result()).toBe('street-portrait')
  expect(observe).toHaveBeenCalledWith(host)
  hook.cleanup()
  expect(disconnect).toHaveBeenCalledOnce()
})
