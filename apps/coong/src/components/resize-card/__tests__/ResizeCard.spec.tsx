import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {ResizeCard} from '..'
import type {ResizeCardProviderProps} from '../ResizeCardProvider'

afterEach(cleanup)

const mount = (props: ResizeCardProviderProps = {}) => {
  const onResize = vi.fn()
  const view = render(() => (
    <ResizeCard.Provider {...props} onResize={onResize}>
      <ResizeCard.Body component="div" data-testid="body">
        <ResizeCard.Handle resizeType="right">right</ResizeCard.Handle>
        <ResizeCard.Handle resizeType="up">up</ResizeCard.Handle>
      </ResizeCard.Body>
    </ResizeCard.Provider>
  ))
  const body = view.getByTestId('body')
  Object.defineProperties(body, {
    offsetHeight: {get: () => Number.parseFloat(body.style.height) || 200},
    offsetWidth: {get: () => Number.parseFloat(body.style.width) || 100},
  })
  return {...view, body, onResize}
}

const mouse = (target: Element | Window, type: string, x: number, y = 0) =>
  fireEvent(target, new MouseEvent(type, {bubbles: true, clientX: x, clientY: y}))

const touch = (target: Element | Window, type: string, x: number, y = 0) =>
  fireEvent(
    target,
    new TouchEvent(type, {
      bubbles: true,
      changedTouches: [{clientX: x, clientY: y} as Touch],
      touches:
        type === 'touchend' || type === 'touchcancel' ? [] : [{clientX: x, clientY: y} as Touch],
    }),
  )

describe('ResizeCard assembled gestures', () => {
  it('notifies changes during mouse movement and the last release position once', () => {
    const view = mount()
    mouse(view.getByText('right'), 'mousedown', 10)
    mouse(document.defaultView!, 'mousemove', 30)
    expect(view.onResize.mock.calls).toEqual([[{height: 200, width: 120}]])
    mouse(document.defaultView!, 'mouseup', 50)
    expect(view.onResize.mock.calls).toEqual([
      [{height: 200, width: 120}],
      [{height: 200, width: 140}],
    ])
    mouse(document.defaultView!, 'mousemove', 80)
    expect(view.body.style.width).toBe('140px')
  })

  it('does not notify a click, unchanged movement, or repeated clamped sizes', () => {
    const view = mount({maxSize: {width: 130}, minSize: {width: 80}})
    mouse(view.getByText('right'), 'mousedown', 0)
    mouse(document.defaultView!, 'mouseup', 0)
    expect(view.onResize).not.toHaveBeenCalled()
    mouse(view.getByText('right'), 'mousedown', 0)
    mouse(document.defaultView!, 'mousemove', 100)
    mouse(document.defaultView!, 'mousemove', 200)
    mouse(document.defaultView!, 'mouseup', 200)
    expect(view.onResize.mock.calls).toEqual([[{height: 200, width: 130}]])
  })

  it('clamps to the minimum and ignores movement on a fixed axis', () => {
    const view = mount({minSize: {width: 80}, preventHeightResize: true})
    mouse(view.getByText('right'), 'mousedown', 0)
    mouse(document.defaultView!, 'mousemove', 50)
    mouse(document.defaultView!, 'mousemove', -200)
    mouse(document.defaultView!, 'mouseup', -300)
    expect(view.onResize.mock.calls).toEqual([
      [{height: 200, width: 130}],
      [{height: 200, width: 80}],
    ])
    mouse(view.getByText('up'), 'mousedown', 0)
    mouse(document.defaultView!, 'mouseup', 0, -50)
    expect(view.onResize).toHaveBeenCalledTimes(2)
  })

  it.each(['preventWidthResize', 'preventHeightResize'] as const)(
    'reports the actual fixed axis for %s',
    (fixed) => {
      const view = mount({[fixed]: true})
      const vertical = fixed === 'preventWidthResize'
      mouse(view.getByText(vertical ? 'up' : 'right'), 'mousedown', 0)
      mouse(document.defaultView!, 'mouseup', 30, -20)
      expect(view.onResize).toHaveBeenCalledExactlyOnceWith({
        height: vertical ? 220 : 200,
        width: vertical ? 100 : 130,
      })
      expect(view.body.style[vertical ? 'width' : 'height']).toBe('')
    },
  )

  it('uses touch release coordinates and starts a second drag from the current size', () => {
    const view = mount()
    touch(view.getByText('right'), 'touchstart', 10)
    touch(document.defaultView!, 'touchmove', 30)
    touch(document.defaultView!, 'touchend', 50)
    touch(view.getByText('right'), 'touchstart', 70)
    touch(document.defaultView!, 'touchend', 80)
    expect(view.onResize.mock.calls).toEqual([
      [{height: 200, width: 120}],
      [{height: 200, width: 140}],
      [{height: 200, width: 150}],
    ])
  })

  it('stops cancelled touch gestures and removes window listeners on disposal', () => {
    const view = mount()
    touch(view.getByText('right'), 'touchstart', 0)
    touch(document.defaultView!, 'touchmove', 20)
    touch(document.defaultView!, 'touchcancel', 80)
    touch(document.defaultView!, 'touchmove', 90)
    expect(view.onResize).toHaveBeenCalledExactlyOnceWith({height: 200, width: 120})
    mouse(view.getByText('right'), 'mousedown', 0)
    view.unmount()
    mouse(document.defaultView!, 'mousemove', 100)
    mouse(document.defaultView!, 'mouseup', 100)
    expect(view.onResize).toHaveBeenCalledTimes(1)
  })
})
