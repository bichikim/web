/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {DEFAULT_POFFO_PLACEMENT} from '@winter-love/wallpaper/settings/model'
import {usePlacement} from '../use-placement'

const target = {
  getBoundingClientRect: () => ({height: 100, width: 200}),
  releasePointerCapture: vi.fn(),
  setPointerCapture: vi.fn(),
}
const pointer = (x: number, y: number) => ({
  button: 0,
  clientX: x,
  clientY: y,
  currentTarget: target,
  pointerId: 1,
  preventDefault: vi.fn(),
})

it('should move the preview immediately and persist only the completed drag', () => {
  const onChange = vi.fn()
  const {result, cleanup} = renderHook(() =>
    usePlacement({onChange, value: () => DEFAULT_POFFO_PLACEMENT}),
  )
  result.start(pointer(20, 20))
  result.move(pointer(60, 30))
  expect(result.placement()).toEqual({scale: 1, x: 0.7, y: 0.6})
  expect(onChange).not.toHaveBeenCalled()
  result.finish(pointer(60, 30))
  expect(onChange).toHaveBeenCalledExactlyOnceWith({scale: 1, x: 0.7, y: 0.6})
  cleanup()
})

it('should constrain movement to the screen and discard a cancelled drag', () => {
  const onChange = vi.fn()
  const {result, cleanup} = renderHook(() =>
    usePlacement({onChange, value: () => DEFAULT_POFFO_PLACEMENT}),
  )
  result.start(pointer(20, 20))
  result.move(pointer(1000, -1000))
  expect(result.placement()).toEqual({scale: 1, x: 1, y: 0})
  result.cancel()
  expect(result.placement()).toEqual(DEFAULT_POFFO_PLACEMENT)
  expect(onChange).not.toHaveBeenCalled()
  cleanup()
})

it('should permit precise keyboard movement and ignore unrelated keys', () => {
  const onChange = vi.fn()
  const {result, cleanup} = renderHook(() =>
    usePlacement({onChange, value: () => DEFAULT_POFFO_PLACEMENT}),
  )
  const preventDefault = vi.fn()
  result.keyboard({key: 'ArrowRight', preventDefault})
  expect(onChange).toHaveBeenCalledWith({scale: 1, x: 0.52, y: 0.5})
  result.keyboard({key: 'Enter', preventDefault})
  expect(onChange).toHaveBeenCalledTimes(1)
  expect(preventDefault).toHaveBeenCalledOnce()
  cleanup()
})

it('should leave a non-editable preview unchanged for pointer and keyboard input', () => {
  const onChange = vi.fn()
  const {result, cleanup} = renderHook(() => usePlacement({enabled: () => false, onChange}))
  result.start(pointer(10, 10))
  result.move(pointer(50, 50))
  result.finish(pointer(50, 50))
  result.keyboard({key: 'ArrowRight', preventDefault: vi.fn()})
  expect(result.placement()).toEqual(DEFAULT_POFFO_PLACEMENT)
  expect(result.dragging()).toBe(false)
  expect(onChange).not.toHaveBeenCalled()
  cleanup()
})
