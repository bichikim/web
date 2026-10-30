/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {usePlaybackView} from '../use-playback-view'
import type {RuntimeView} from '../../tracking/types'
afterEach(() => vi.unstubAllGlobals())
test('should restore saved pan and zoom without fitting them away on resize', async () => {
  let resized: ResizeObserverCallback | undefined
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resized = callback
      }
      observe() {}
      disconnect() {}
    },
  )
  const element = document.createElement('div')
  let width = 640
  Object.defineProperties(element, {clientHeight: {value: 480}, clientWidth: {get: () => width}})
  const [saved, setSaved] = createSignal<RuntimeView>({
    camera: {x: 120, y: -40, zoom: 0.75},
    fitted: false,
  })
  const {result} = renderHook(() =>
    usePlaybackView({
      element: () => element,
      height: () => 200,
      onChange: setSaved,
      saved,
      width: () => 400,
    }),
  )
  expect(result.camera()).toEqual(saved().camera)
  width = 800
  resized?.([], {} as ResizeObserver)
  expect(result.camera()).toEqual({x: 120, y: -40, zoom: 0.75})
  setSaved({camera: {x: -20, y: 30, zoom: 2}, fitted: false})
  expect(result.camera()).toEqual({x: -20, y: 30, zoom: 2})
  result.fit()
  await Promise.resolve()
  expect(saved().fitted).toBe(true)
  expect(result.camera().zoom).not.toBe(2)
})
