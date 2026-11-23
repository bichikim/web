/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {useContext} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {ResizeCardContext, ResizeCardProvider} from '../ResizeCardProvider'
import {ResizeCardHandle} from '../ResizeCardHandle'

const ResizeSurface = () => {
  const {setElement} = useContext(ResizeCardContext)
  return (
    <div
      ref={(element) => {
        Object.defineProperties(element, {
          offsetHeight: {value: 80},
          offsetWidth: {value: 120},
        })
        setElement(element)
      }}
    >
      <ResizeCardHandle aria-label="Resize" resizeType="down-right" />
    </div>
  )
}

it('should report the final clamped size exactly once on mouse release', () => {
  const onResize = vi.fn()
  const view = render(() => (
    <ResizeCardProvider maxSize={{height: 100}} onResize={onResize} preventWidthResize>
      <ResizeSurface />
    </ResizeCardProvider>
  ))
  const eventTarget = view.container.ownerDocument.defaultView!

  fireEvent.mouseDown(view.getByRole('button', {name: 'Resize'}), {clientX: 10, clientY: 10})
  fireEvent.mouseMove(eventTarget, {clientX: 20, clientY: 25})
  expect(onResize).not.toHaveBeenCalled()
  fireEvent.mouseUp(eventTarget, {clientX: 20, clientY: 40})
  fireEvent.mouseUp(eventTarget, {clientX: 20, clientY: 45})

  expect(onResize).toHaveBeenCalledExactlyOnceWith({height: 100, width: 120})
})

it('should use the released touch position even when there was no move event', () => {
  const onResize = vi.fn()
  const view = render(() => (
    <ResizeCardProvider onResize={onResize}>
      <ResizeSurface />
    </ResizeCardProvider>
  ))
  fireEvent.touchStart(view.getByRole('button', {name: 'Resize'}), {
    touches: [{clientX: 10, clientY: 10}],
  })
  fireEvent.touchEnd(view.container.ownerDocument.defaultView!, {
    changedTouches: [{clientX: 30, clientY: 40}],
  })

  expect(onResize).toHaveBeenCalledExactlyOnceWith({height: 110, width: 140})
})
