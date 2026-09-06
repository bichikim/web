/**
 * @vitest-environment jsdom
 */

import {render} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'
import {useDrag} from './'

describe('useDrag', () => {
  it.each(['pointercancel', 'touchcancel', 'blur'])(
    'should end the active drag when %s is dispatched',
    (eventType) => {
      const callback = vi.fn()
      const view = render(() => {
        const drag = useDrag(callback)
        return <div onPointerDown={drag.onPointerDown} />
      })
      const element = view.container.firstElementChild!
      element.dispatchEvent(
        new MouseEvent('pointerdown', {bubbles: true, clientX: 10, clientY: 20}),
      )
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
      view.unmount()
    },
  )
})
