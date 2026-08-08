/**
 * @vitest-environment jsdom
 */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {
  ELEMENT_IDENTIFIER_GLOBAL_TOUCH,
  generateGlobalTouchEventName,
  useGlobalTouchEmitter,
} from '../use-global-touch'

describe('useGlobalTouchEmitter', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(document, 'elementsFromPoint')
  })

  it('should release pressed ids when a pointer is cancelled', () => {
    const element = document.createElement('button')
    element.setAttribute(ELEMENT_IDENTIFIER_GLOBAL_TOUCH, 'C4')
    const elementsFromPoint = vi.fn().mockReturnValue([element])
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: elementsFromPoint,
    })
    const states: boolean[] = []

    window.addEventListener(generateGlobalTouchEventName('C4'), ((event: CustomEvent) => {
      states.push(event.detail.down)
    }) as EventListener)
    const {cleanup} = renderHook(() => useGlobalTouchEmitter())

    window.dispatchEvent(new MouseEvent('pointerdown', {clientX: 12, clientY: 34}))
    window.dispatchEvent(new Event('pointercancel'))

    expect(elementsFromPoint).toHaveBeenCalledWith(12, 34)
    expect(states).toEqual([true, false])
    cleanup()
  })
})
