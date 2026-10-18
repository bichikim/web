/** @vitest-environment jsdom */

import {createRoot} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {usePointerValueDrag} from '../use-pointer-value-drag'

const createPointerEvent = (type: string, pointerId: number) => {
  const event = new MouseEvent(type, {button: 0})
  Object.defineProperty(event, 'pointerId', {value: pointerId})
  return event as PointerEvent
}

test('should release global gesture listeners when its owner is disposed', () => {
  const onMove = vi.fn()
  const owned = createRoot((dispose) => ({
    dispose,
    drag: usePointerValueDrag({
      enabled: () => true,
      getBounds: () => new DOMRect(),
      onMove,
    }),
  }))
  try {
    owned.drag.handlePointerDown(createPointerEvent('pointerdown', 1))
    expect(onMove).toHaveBeenCalledOnce()
    owned.dispose()
    globalThis.dispatchEvent(createPointerEvent('pointermove', 1))
    expect(onMove).toHaveBeenCalledOnce()
  } finally {
    owned.dispose()
  }
})

test('should cancel only the active pointer and stop delivering later moves', () => {
  const onMove = vi.fn()
  const owned = createRoot((dispose) => ({
    dispose,
    drag: usePointerValueDrag({
      enabled: () => true,
      getBounds: () => new DOMRect(),
      onMove,
    }),
  }))
  try {
    owned.drag.handlePointerDown(createPointerEvent('pointerdown', 1))
    globalThis.dispatchEvent(createPointerEvent('pointercancel', 2))
    globalThis.dispatchEvent(createPointerEvent('pointermove', 1))
    expect(onMove).toHaveBeenCalledTimes(2)
    globalThis.dispatchEvent(createPointerEvent('pointercancel', 1))
    globalThis.dispatchEvent(createPointerEvent('pointermove', 1))
    expect(onMove).toHaveBeenCalledTimes(2)
  } finally {
    owned.dispose()
  }
})

test.each([
  {bounds: new DOMRect(), button: 2, enabled: true, name: 'secondary button'},
  {bounds: new DOMRect(), button: 0, enabled: false, name: 'disabled updates'},
  {bounds: undefined, button: 0, enabled: true, name: 'missing bounds'},
])('should ignore a gesture with $name', ({button, enabled, bounds}) => {
  const onMove = vi.fn()
  const owned = createRoot((dispose) => ({
    dispose,
    drag: usePointerValueDrag({
      enabled: () => enabled,
      getBounds: () => bounds,
      onMove,
    }),
  }))
  try {
    owned.drag.handlePointerDown(new MouseEvent('pointerdown', {button}) as PointerEvent)
    globalThis.dispatchEvent(createPointerEvent('pointermove', 1))
    expect(onMove).not.toHaveBeenCalled()
  } finally {
    owned.dispose()
  }
})
