/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {PSwipeTrackItem} from '../SwipeTrackItem'

const TRACK = {
  artist: 'Artist',
  durationSeconds: 1,
  id: 'one',
  source: '/one.mp3',
  title: 'One',
} as const

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 0
  }
}

const renderTrack = () => {
  const onRemove = vi.fn()
  const onSelect = vi.fn()
  render(() => (
    <PSwipeTrackItem
      current={false}
      index={0}
      onRemove={onRemove}
      onSelect={onSelect}
      track={TRACK}
    />
  ))

  return {
    button: screen.getByRole('button', {name: 'One · Artist · 밀어서 삭제'}),
    onRemove,
    onSelect,
  }
}

const swipe = (button: HTMLElement, endX: number) => {
  fireEvent.pointerDown(button, {button: 0, clientX: 0, clientY: 0, pointerId: 1})
  fireEvent.pointerMove(button, {clientX: endX, clientY: 0, pointerId: 1})
  fireEvent.pointerUp(button, {clientX: endX, clientY: 0, pointerId: 1})
}

const installPointerCapture = (button: HTMLElement) => {
  const hasPointerCapture = vi.fn(() => true)
  const releasePointerCapture = vi.fn()
  const setPointerCapture = vi.fn()

  Object.defineProperties(button, {
    hasPointerCapture: {configurable: true, value: hasPointerCapture},
    releasePointerCapture: {configurable: true, value: releasePointerCapture},
    setPointerCapture: {configurable: true, value: setPointerCapture},
  })

  return {hasPointerCapture, releasePointerCapture, setPointerCapture}
}

describe('PSwipeTrackItem', () => {
  beforeEach(() => vi.stubGlobal('PointerEvent', TestPointerEvent))

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it.each([-64, 64])('should remove after crossing the swipe threshold at %i pixels', (endX) => {
    const {button, onRemove} = renderTrack()

    swipe(button, endX)

    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('should restore the row and suppress selection after a short swipe', () => {
    const {button, onRemove, onSelect} = renderTrack()

    swipe(button, 63)
    fireEvent.click(button)

    expect(onRemove).not.toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()
    expect(button.style.transform).toBe('')
  })

  it('should preserve selection after a vertical gesture', () => {
    const {button, onRemove, onSelect} = renderTrack()

    fireEvent.pointerDown(button, {button: 0, clientX: 0, clientY: 0, pointerId: 1})
    fireEvent.pointerMove(button, {clientX: 2, clientY: 20, pointerId: 1})
    fireEvent.pointerUp(button, {clientX: 2, clientY: 20, pointerId: 1})
    fireEvent.click(button)

    expect(onRemove).not.toHaveBeenCalled()
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('should ignore movement below the drag intent threshold', () => {
    const {button, onRemove, onSelect} = renderTrack()

    fireEvent.pointerDown(button, {button: 0, clientX: 0, clientY: 0, pointerId: 1})
    fireEvent.pointerMove(button, {clientX: 7, clientY: 0, pointerId: 1})

    expect(button.style.transform).toBe('')

    fireEvent.pointerUp(button, {clientX: 7, clientY: 0, pointerId: 1})
    fireEvent.click(button)

    expect(onRemove).not.toHaveBeenCalled()
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('should cap a continuing horizontal drag and reset it after pointer cancellation', () => {
    const {button, onRemove, onSelect} = renderTrack()
    const pointerCapture = installPointerCapture(button)

    fireEvent.pointerDown(button, {button: 0, clientX: 0, clientY: 0, pointerId: 1})
    fireEvent.pointerMove(button, {clientX: 65, clientY: 0, pointerId: 1})
    fireEvent.pointerMove(button, {clientX: 200, clientY: 0, pointerId: 1})

    const swipeLayers = button.closest('li')?.querySelectorAll(':scope > div')

    expect(button.style.transform).toBe('translateX(5rem)')
    expect(button.dataset.swipeDeleteReady).toBe('')
    expect(button.classList.contains('transition-none')).toBe(true)
    expect(swipeLayers?.[0]?.getAttribute('style')).toContain('width: 5rem')
    expect(swipeLayers?.[1]?.getAttribute('style')).toContain('width: 0rem')
    expect(screen.getByText('One, 놓으면 삭제')).toBeInTheDocument()

    fireEvent.pointerCancel(button, {pointerId: 2})
    expect(button.style.transform).toBe('translateX(5rem)')

    fireEvent.pointerCancel(button, {pointerId: 1})
    fireEvent.click(button)

    expect(button.style.transform).toBe('')
    expect(onRemove).not.toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()
    expect(pointerCapture.setPointerCapture).toHaveBeenCalledWith(1)
    expect(pointerCapture.hasPointerCapture).toHaveBeenCalledWith(1)
    expect(pointerCapture.releasePointerCapture).toHaveBeenCalledWith(1)

    fireEvent.click(button)
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('should ignore non-primary and unmatched pointer events', () => {
    const {button, onRemove, onSelect} = renderTrack()

    fireEvent.pointerDown(button, {button: 2, clientX: 0, clientY: 0, pointerId: 1})
    fireEvent.pointerMove(button, {clientX: 80, clientY: 0, pointerId: 1})
    fireEvent.pointerUp(button, {clientX: 80, clientY: 0, pointerId: 1})
    fireEvent(button, new TestPointerEvent('lostpointercapture', {pointerId: 1}))
    fireEvent.click(button)

    expect(button.style.transform).toBe('')
    expect(onRemove).not.toHaveBeenCalled()
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('should restore the row when pointer capture is lost', () => {
    const {button, onRemove, onSelect} = renderTrack()

    fireEvent.pointerDown(button, {button: 0, clientX: 0, clientY: 0, pointerId: 1})
    fireEvent.pointerMove(button, {clientX: 40, clientY: 0, pointerId: 1})
    fireEvent(button, new TestPointerEvent('lostpointercapture', {pointerId: 2}))
    expect(button.style.transform).toBe('translateX(2.5rem)')

    fireEvent(button, new TestPointerEvent('lostpointercapture', {pointerId: 1}))
    fireEvent.click(button)

    expect(onRemove).not.toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()
    expect(button.style.transform).toBe('')
  })

  it('should provide the Delete key as a gesture alternative', () => {
    const {button, onRemove} = renderTrack()

    fireEvent.keyDown(button, {key: 'Enter'})
    expect(onRemove).not.toHaveBeenCalled()

    fireEvent.keyDown(button, {key: 'Delete'})

    expect(onRemove).toHaveBeenCalledOnce()
    expect(button.getAttribute('aria-keyshortcuts')).toBe('Delete')
  })

  it('should render the current track without removal affordances', () => {
    const onSelect = vi.fn()
    render(() => <PSwipeTrackItem current index={1} onSelect={onSelect} track={TRACK} />)
    const button = screen.getByRole('button', {name: 'One · Artist'})

    expect(button.getAttribute('aria-current')).toBe('true')
    expect(button.getAttribute('aria-keyshortcuts')).toBeNull()
    expect(button).not.toHaveAttribute('title')
    expect(button.classList.contains('bg-primary-soft')).toBe(true)
    expect(button.textContent).toContain('2')
    expect(button.textContent).toContain('One')
    expect(button.textContent).toContain('Artist')

    fireEvent.pointerDown(button, {button: 0, clientX: 0, clientY: 0, pointerId: 1})
    fireEvent.pointerMove(button, {clientX: 80, clientY: 0, pointerId: 1})
    fireEvent.pointerUp(button, {clientX: 80, clientY: 0, pointerId: 1})
    fireEvent.keyDown(button, {key: 'Delete'})
    fireEvent.click(button)

    expect(button.style.transform).toBe('')
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('should clip the swipe layer without hiding the rendered track content', () => {
    const {button} = renderTrack()
    const listItem = button.closest('li')

    expect(listItem?.classList.contains('overflow-clip')).toBe(true)
    expect(listItem?.classList.contains('overflow-hidden')).toBe(false)
    expect(button.textContent).toContain('One')
    expect(button.textContent).toContain('Artist')
  })
})
