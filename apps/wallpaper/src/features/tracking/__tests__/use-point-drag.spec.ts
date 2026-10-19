/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {renderHook} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {usePointDrag} from '../use-point-drag'
test('should preview bounded movement and commit only on release', () => {
  const preview = vi.fn()
  const [value, setValue] = createSignal({x: 0.5, y: 0.3})
  const save = vi.fn((point: {x: number; y: number}) => {
    setValue(point)
  })
  const {result, cleanup} = renderHook(() =>
    usePointDrag({
      bounds: () => ({maxX: 1, maxY: 1, minX: 0, minY: 0}),
      onChange: save,
      onPreview: preview,
      rect: () => ({height: 100, width: 200}),
      value,
    }),
  )
  const target = {focus: vi.fn(), releasePointerCapture: vi.fn(), setPointerCapture: vi.fn()}
  const event = {
    button: 0,
    clientX: 20,
    clientY: 20,
    currentTarget: target,
    pointerId: 1,
    preventDefault: vi.fn(),
  }
  result.start(event)
  expect(target.focus).toHaveBeenCalledWith({preventScroll: true})
  result.move({...event, clientX: 120, clientY: 100})
  expect(result.point()).toEqual({x: 1, y: 1})
  expect(preview).toHaveBeenLastCalledWith({x: 1, y: 1})
  expect(save).not.toHaveBeenCalled()
  result.finish(event)
  expect(save).toHaveBeenCalledExactlyOnceWith({x: 1, y: 1})
  expect(preview).toHaveBeenLastCalledWith(null)
  expect(target.releasePointerCapture).toHaveBeenCalledWith(1)
  cleanup()
})
test('should cancel pointer movement and support keyboard adjustment outside the monitor', () => {
  const value = () => ({x: -1, y: 0})
  const save = vi.fn()
  const {result, cleanup} = renderHook(() =>
    usePointDrag({
      bounds: () => ({maxX: 4, maxY: 4, minX: -3, minY: -3}),
      onChange: save,
      rect: () => ({height: 100, width: 200}),
      value,
    }),
  )
  const event = {
    button: 0,
    clientX: 20,
    clientY: 20,
    currentTarget: {focus: vi.fn(), releasePointerCapture: vi.fn(), setPointerCapture: vi.fn()},
    pointerId: 1,
    preventDefault: vi.fn(),
  }
  result.start(event)
  result.move({...event, clientX: 100})
  result.keyboard({key: 'Escape', preventDefault: vi.fn()})
  result.finish(event)
  expect(save).not.toHaveBeenCalled()
  expect(result.point()).toEqual(value())
  result.keyboard({key: 'ArrowRight', preventDefault: vi.fn()})
  expect(save.mock.lastCall?.[0].x).toBeCloseTo(-0.99)
  cleanup()
})
