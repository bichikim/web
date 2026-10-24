/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'

import {useDrag} from '../index'

describe('useDrag', () => {
  it('should track pointer displacement while the element is dragged', async () => {
    const view = render(() => {
      const drag = useDrag()
      return (
        <div onMouseDown={drag.onMouseDown}>
          <output>
            {JSON.stringify({dragging: drag.isDragging(), position: drag.position()})}
          </output>
        </div>
      )
    })
    const element = view.container.firstElementChild!

    fireEvent.mouseDown(element, {clientX: 10, clientY: 20})
    fireEvent.mouseMove(document, {clientX: 25, clientY: 50})

    expect(view.container.textContent).toContain('"dragging":true')
    expect(view.container.textContent).toContain('"position":{"x":15,"y":30}')

    fireEvent.mouseUp(document)
    expect(view.container.textContent).toContain('"dragging":false')
  })
})
