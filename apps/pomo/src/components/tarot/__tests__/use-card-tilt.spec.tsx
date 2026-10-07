/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {useCardTilt} from '../use-card-tilt'

const preference = new EventTarget()
let reduced = false
let frames = new Map<number, FrameRequestCallback>()
let frameIndex = 0
const flushFrames = () => {
  for (let time = 0; frames.size > 0 && time < 3000; time += 64) {
    const pending = [...frames.values()]
    frames.clear()
    for (const callback of pending) {
      callback(time)
    }
  }
}

const Card = () => {
  const tilt = useCardTilt()
  return (
    <div
      role="group"
      aria-label="card"
      tabIndex={0}
      onPointerMove={tilt.handlePointerMove}
      onPointerDown={tilt.handlePointerDown}
      onPointerUp={tilt.handlePointerUp}
      onPointerLeave={tilt.handlePointerLeave}
      onKeyDown={tilt.handleKeyDown}
    >
      <output aria-label="tilt">{`${tilt.offset().x},${tilt.offset().y}`}</output>
    </div>
  )
}

const pointerEvent = (type: string, properties: Record<string, number | string>) => {
  const event = new Event(type, {bubbles: true, cancelable: true})
  Object.assign(event, properties)
  return event
}

beforeEach(() => {
  reduced = false
  frames = new Map()
  vi.stubGlobal('matchMedia', () => ({
    addEventListener: preference.addEventListener.bind(preference),
    get matches() {
      return reduced
    },
    removeEventListener: preference.removeEventListener.bind(preference),
  }))
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frameIndex += 1
    frames.set(frameIndex, callback)
    return frameIndex
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    bottom: 600,
    height: 600,
    left: 0,
    right: 400,
    toJSON: () => ({}),
    top: 0,
    width: 400,
    x: 0,
    y: 0,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useCardTilt', () => {
  it('should ignore mouse movement without an active drag', () => {
    render(Card)
    const card = screen.getByRole('group', {name: 'card'})
    fireEvent(card, pointerEvent('pointermove', {clientX: 400, clientY: 300, pointerType: 'mouse'}))
    flushFrames()
    expect(screen.getByLabelText('tilt')).toHaveTextContent('0,0')
    expect(frames.size).toBe(0)
    fireEvent.pointerLeave(card)
    flushFrames()
    expect(screen.getByLabelText('tilt')).toHaveTextContent('0,0')
  })

  it.each(['mouse', 'touch'])(
    'should rotate from a %s drag and settle on release',
    (pointerType) => {
      render(Card)
      const card = screen.getByRole('group', {name: 'card'})
      fireEvent(
        card,
        pointerEvent('pointerdown', {
          button: 0,
          clientX: 100,
          clientY: 100,
          pointerId: 1,
          pointerType,
        }),
      )
      fireEvent(
        card,
        pointerEvent('pointermove', {clientX: 600, clientY: -200, pointerId: 1, pointerType}),
      )
      flushFrames()
      expect(screen.getByLabelText('tilt')).toHaveTextContent('-1,1')
      fireEvent(card, pointerEvent('pointerup', {pointerId: 1}))
      flushFrames()
      expect(screen.getByLabelText('tilt')).toHaveTextContent('0,0')
      fireEvent(
        card,
        pointerEvent('pointermove', {clientX: 400, clientY: 0, pointerId: 1, pointerType}),
      )
      flushFrames()
      expect(screen.getByLabelText('tilt')).toHaveTextContent('0,0')
    },
  )

  it('should continue from the current tilt and ignore another pointer during a drag', () => {
    render(Card)
    const card = screen.getByRole('group', {name: 'card'})
    fireEvent.keyDown(card, {key: 'ArrowRight'})
    flushFrames()
    fireEvent(
      card,
      pointerEvent('pointerdown', {button: 0, clientX: 100, clientY: 100, pointerId: 1}),
    )
    fireEvent(
      card,
      pointerEvent('pointerdown', {button: 0, clientX: 200, clientY: 100, pointerId: 2}),
    )
    fireEvent(
      card,
      pointerEvent('pointermove', {clientX: 400, clientY: 100, pointerId: 2, pointerType: 'mouse'}),
    )
    flushFrames()
    expect(screen.getByLabelText('tilt')).toHaveTextContent('0.25,0')
    fireEvent(card, pointerEvent('pointermove', {clientX: 135, clientY: 100, pointerId: 1}))
    flushFrames()
    expect(screen.getByLabelText('tilt')).toHaveTextContent('0,0')
  })

  it('should support arrow keys and cancel scheduled rendering when unmounted', () => {
    const view = render(Card)
    fireEvent.keyDown(screen.getByRole('group', {name: 'card'}), {key: 'ArrowLeft'})
    flushFrames()
    expect(screen.getByLabelText('tilt')).toHaveTextContent('-0.25,0')
    fireEvent.keyDown(screen.getByRole('group', {name: 'card'}), {key: 'ArrowRight'})
    expect(frames.size).toBe(1)
    view.unmount()
    expect(frames.size).toBe(0)
  })

  it('should reset motion immediately and stop interaction when reduced motion is requested', () => {
    render(Card)
    const card = screen.getByRole('group', {name: 'card'})
    fireEvent.keyDown(card, {key: 'ArrowRight'})
    flushFrames()
    expect(screen.getByLabelText('tilt')).toHaveTextContent('0.25,0')
    reduced = true
    preference.dispatchEvent(new Event('change'))
    fireEvent.keyDown(card, {key: 'ArrowLeft'})
    flushFrames()
    expect(screen.getByLabelText('tilt')).toHaveTextContent('0,0')
    expect(frames.size).toBe(0)
  })
})
