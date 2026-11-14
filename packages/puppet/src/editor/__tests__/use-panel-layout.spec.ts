/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {beforeEach, describe, expect, test} from 'vitest'
import {usePanelLayout} from '../use-panel-layout'

const pointer = (type: string, pointerId: number, clientX = 300) =>
  Object.assign(new Event(type, {cancelable: true}), {button: 0, clientX, pointerId})

describe('usePanelLayout', () => {
  beforeEach(() => localStorage.clear())

  test.each(['pointermove', 'pointerup', 'pointercancel'])(
    'should ignore another pointer during resize on %s',
    (type) => {
      const {result, cleanup} = renderHook(usePanelLayout)
      result.startResize('left', pointer('pointerdown', 1) as PointerEvent)
      globalThis.dispatchEvent(pointer(type, 2, 0))
      expect(result.leftSize()).toBe(300)
      expect(result.leftOpen()).toBe(true)
      expect(result.resizingPosition()).toBe('left')
      globalThis.dispatchEvent(pointer('pointermove', 1, 320))
      expect(result.leftSize()).toBe(320)
      globalThis.dispatchEvent(pointer('pointerup', 1))
      expect(result.resizingPosition()).toBeNull()
      cleanup()
    },
  )

  test('should release resize listeners when the window loses focus', () => {
    const {result, cleanup} = renderHook(usePanelLayout)
    result.startResize('left', pointer('pointerdown', 1) as PointerEvent)
    globalThis.dispatchEvent(new Event('blur'))
    expect(result.resizingPosition()).toBeNull()
    globalThis.dispatchEvent(pointer('pointermove', 1, 0))
    globalThis.dispatchEvent(pointer('pointerup', 1))
    expect(result.leftSize()).toBe(300)
    expect(result.leftOpen()).toBe(true)
    cleanup()
  })
})
