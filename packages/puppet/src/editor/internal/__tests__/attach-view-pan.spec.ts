/** @vitest-environment jsdom */
import {describe, expect, test, vi} from 'vitest'
import {attachViewPan} from '../attach-view-pan'

const pointer = (type: string, pointerId: number, clientX = 0) =>
  Object.assign(new Event(type), {button: 1, clientX, clientY: 0, pointerId})

const setup = () => {
  const element = document.createElement('div')
  const captured = new Set<number>()
  element.setPointerCapture = (id) => {
    captured.add(id)
  }
  element.hasPointerCapture = (id) => captured.has(id)
  element.releasePointerCapture = (id) => {
    captured.delete(id)
  }
  const change = vi.fn()
  const panning = vi.fn()
  const dispose = attachViewPan({
    camera: () => ({x: 0, y: 0, zoom: 1}),
    element,
    onChange: change,
    onPanningChange: panning,
  })
  return {captured, change, dispose, element, panning}
}

describe('attachViewPan', () => {
  test.each(['pointercancel', 'lostpointercapture'])(
    'should ignore %s from another pointer',
    (type) => {
      const {element, change, dispose} = setup()
      element.dispatchEvent(pointer('pointerdown', 1))
      element.dispatchEvent(pointer(type, 2))
      element.dispatchEvent(pointer('pointermove', 1, 20))
      expect(change).toHaveBeenCalledWith({x: -20, y: 0, zoom: 1})
      dispose()
    },
  )

  test.each(['blur', 'dispose'])('should release the active capture on %s', (reason) => {
    const {element, change, panning, captured, dispose} = setup()
    element.dispatchEvent(pointer('pointerdown', 1))
    if (reason === 'blur') {
      globalThis.dispatchEvent(new Event('blur'))
    } else {
      dispose()
    }
    expect(captured.size).toBe(0)
    expect(panning).toHaveBeenLastCalledWith(false)
    element.dispatchEvent(pointer('pointermove', 1, 20))
    expect(change).not.toHaveBeenCalled()
    dispose()
  })
})
