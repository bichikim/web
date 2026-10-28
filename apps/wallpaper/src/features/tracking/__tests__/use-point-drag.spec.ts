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
  const target = {
    focus: vi.fn(),
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
    setPointerCapture: vi.fn(),
  }
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
    currentTarget: {
      focus: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    },
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

const createDrag = () => {
  const [value, setValue] = createSignal({x: 0.5, y: 0.3})
  const preview = vi.fn()
  const save = vi.fn((point: {x: number; y: number}): void | Promise<void> => {
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
  const target = {
    focus: vi.fn(),
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
    setPointerCapture: vi.fn(),
  }
  const event = {
    button: 0,
    clientX: 20,
    clientY: 20,
    currentTarget: target,
    pointerId: 1,
    preventDefault: vi.fn(),
  }
  result.start(event)
  result.move({...event, clientX: 120, clientY: 100})
  return {cleanup, event, preview, result, save, setValue, target, value}
}

test('should preserve the keyboard commit after later pointer movement and release', () => {
  const {cleanup, event, preview, result, save, target, value} = createDrag()
  result.keyboard({key: 'ArrowLeft', preventDefault: vi.fn()})
  expect(save).toHaveBeenCalledExactlyOnceWith({x: 0.99, y: 1})
  result.move({...event, clientX: 60})
  result.finish(event)
  expect(save).toHaveBeenCalledTimes(1)
  expect(result.dragging()).toBe(false)
  expect(result.point()).toEqual(value())
  expect(preview).toHaveBeenLastCalledWith(null)
  expect(target.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(1)
  expect(result.point()).toEqual({x: 0.99, y: 1})
  cleanup()
})

test('should end the drag before an asynchronous keyboard save settles', async () => {
  const {cleanup, event, preview, result, save, setValue, target, value} = createDrag()
  const pending = Promise.withResolvers<void>()
  const commit = pending.promise.then(() => {
    setValue({x: 0.99, y: 1})
  })
  save.mockReturnValue(commit)
  expect(result.keyboard({key: 'ArrowLeft', preventDefault: vi.fn()})).toBe(commit)
  expect(result.dragging()).toBe(false)
  expect(preview).toHaveBeenLastCalledWith(null)
  expect(target.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(1)
  result.move({...event, clientX: 60})
  result.finish(event)
  expect(save).toHaveBeenCalledExactlyOnceWith({x: 0.99, y: 1})
  pending.resolve()
  await commit
  expect(result.point()).toEqual(value())
  expect(value()).toEqual({x: 0.99, y: 1})
  cleanup()
})

test('should preserve a new drag started by the keyboard commit callback', () => {
  const {cleanup, event, preview, result, save, target} = createDrag()
  const nextEvent = {...event, pointerId: 2}
  save.mockImplementationOnce(() => {
    expect(result.dragging()).toBe(false)
    expect(target.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(1)
    expect(preview).toHaveBeenLastCalledWith(null)
    result.start(nextEvent, {x: 0.2, y: 0.4})
  })
  result.keyboard({key: 'ArrowLeft', preventDefault: vi.fn()})
  result.finish(event)
  expect(result.dragging()).toBe(true)
  expect(result.point()).toEqual({x: 0.2, y: 0.4})
  result.finish(nextEvent)
  expect(save).toHaveBeenNthCalledWith(2, {x: 0.2, y: 0.4})
  cleanup()
})

test.each(['Escape', 'cancel', 'cleanup'])(
  'should release the captured pointer and discard the draft on %s',
  (action) => {
    const {cleanup, event, preview, result, save, target, value} = createDrag()
    switch (action) {
      case 'Escape':
        result.keyboard({key: action, preventDefault: vi.fn()})
        break
      case 'cancel':
        result.cancel()
        break
      case 'cleanup':
        cleanup()
        break
      default:
        throw new Error(`Unexpected action: ${action}`)
    }
    result.finish(event)
    expect(save).not.toHaveBeenCalled()
    expect(target.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(1)
    expect(preview).toHaveBeenLastCalledWith(null)
    expect(result.dragging()).toBe(false)
    if (action !== 'cleanup') {
      expect(result.point()).toEqual(value())
      cleanup()
    }
  },
)

test('should leave the drag active for an unrelated key', () => {
  const {cleanup, event, result, save, target} = createDrag()
  const preventDefault = vi.fn()
  result.keyboard({key: 'Tab', preventDefault})
  expect(preventDefault).not.toHaveBeenCalled()
  expect(result.dragging()).toBe(true)
  expect(target.releasePointerCapture).not.toHaveBeenCalled()
  result.finish(event)
  expect(save).toHaveBeenCalledExactlyOnceWith({x: 1, y: 1})
  cleanup()
})

test('should discard a drag whose pointer capture has already been lost', () => {
  const {cleanup, event, preview, result, save, target} = createDrag()
  target.hasPointerCapture.mockReturnValue(false)
  result.cancel()
  result.finish(event)
  expect(result.dragging()).toBe(false)
  expect(target.releasePointerCapture).not.toHaveBeenCalled()
  expect(preview).toHaveBeenLastCalledWith(null)
  expect(save).not.toHaveBeenCalled()
  cleanup()
})

test('should keep the drag ended when the keyboard save throws', () => {
  const {cleanup, event, preview, result, save, target} = createDrag()
  const error = new Error('Save failed')
  save.mockImplementation(() => {
    throw error
  })
  expect(() => result.keyboard({key: 'ArrowLeft', preventDefault: vi.fn()})).toThrow(error)
  result.finish(event)
  expect(result.dragging()).toBe(false)
  expect(target.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(1)
  expect(preview).toHaveBeenLastCalledWith(null)
  expect(save).toHaveBeenCalledOnce()
  cleanup()
})
