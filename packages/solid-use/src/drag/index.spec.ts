/**
 * @vitest-environment jsdom
 */

import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {useDrag} from './'

describe('useDrag', () => {
  it.each(['pointercancel', 'touchcancel', 'blur'])(
    'should end the active drag when %s is dispatched',
    (eventType) => {
      const callback = vi.fn()
      const element = document.createElement('div')
      const dispose = createRoot((dispose) => {
        useDrag(element, callback)

        return dispose
      })

      element.dispatchEvent(new MouseEvent('pointerdown', {clientX: 10, clientY: 20}))
      window.dispatchEvent(new Event(eventType))
      window.dispatchEvent(new MouseEvent('pointermove', {clientX: 30, clientY: 40}))

      expect(callback).toHaveBeenCalledTimes(2)
      expect(callback).toHaveBeenNthCalledWith(
        2,
        'end',
        expect.objectContaining({
          currentPoint: {x: 10, y: 20},
          startPoint: {x: 10, y: 20},
        }),
      )
      dispose()
    },
  )
})
