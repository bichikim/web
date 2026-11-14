/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {useCardExpansion} from '../use-card-expansion'

const animations = vi.fn()
const close = vi.fn(function close(this: HTMLDialogElement) {
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
})
let reduced = false
const Harness = () => {
  const [dialog, setDialog] = createSignal<HTMLDialogElement | null>(null)
  const [target, setTarget] = createSignal<HTMLDivElement | null>(null)
  const expansion = useCardExpansion({dialog, target})
  return (
    <>
      <button type="button" onClick={expansion.handleOpen}>
        expand
      </button>
      <dialog ref={setDialog} aria-label="card" onClose={expansion.handleClosed}>
        <Show when={expansion.isExpanded()}>
          <div
            ref={setTarget}
            role="group"
            aria-label="expanded card"
            data-phase={expansion.phase()}
            style={expansion.style()}
          />
          <button type="button" onClick={expansion.handleClose}>
            close
          </button>
        </Show>
      </dialog>
    </>
  )
}

beforeEach(() => {
  vi.useFakeTimers({toFake: ['requestAnimationFrame', 'cancelAnimationFrame']})
  reduced = false
  animations.mockReset().mockReturnValue([])
  close.mockClear()
  vi.stubGlobal('matchMedia', () => ({matches: reduced}))
  Object.defineProperty(Element.prototype, 'getAnimations', {configurable: true, value: animations})
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function showModal() {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {configurable: true, value: close})
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(900)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function readBounds(this: HTMLElement) {
      return this.tagName === 'BUTTON'
        ? new DOMRect(40, 60, 200, 300)
        : new DOMRect(0, 0, 1200, 900)
    },
  )
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(Element.prototype, 'getAnimations')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})

describe('useCardExpansion', () => {
  it('should move from the source bounds and close only after returning to them', async () => {
    const opening = Promise.withResolvers<void>()
    const closing = Promise.withResolvers<void>()
    animations
      .mockReturnValueOnce([{finished: opening.promise}])
      .mockReturnValueOnce([{finished: closing.promise}])
    render(Harness)
    const source = screen.getByRole('button', {name: 'expand'})
    fireEvent.click(source)
    const target = screen.getByRole('group', {name: 'expanded card'})
    expect(target).toHaveAttribute('data-phase', 'collapsed')
    expect(target.style.getPropertyValue('--card-expansion-x')).toBe('-460px')
    expect(target.style.getPropertyValue('--card-expansion-y')).toBe('-240px')
    expect(Number(target.style.getPropertyValue('--card-expansion-scale'))).toBeCloseTo(1 / 3)
    vi.advanceTimersToNextFrame()
    expect(target).toHaveAttribute('data-phase', 'expanding')
    opening.resolve()
    await waitFor(() => expect(target).toHaveAttribute('data-phase', 'expanded'))
    fireEvent.click(screen.getByRole('button', {name: 'close'}))
    expect(target).toHaveAttribute('data-phase', 'collapsing')
    expect(close).not.toHaveBeenCalled()
    closing.resolve()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(close).toHaveBeenCalledOnce()
    expect(source).toHaveFocus()
  })

  it('should ignore the interrupted opening completion while the card is closing', async () => {
    const opening = Promise.withResolvers<void>()
    const closing = Promise.withResolvers<void>()
    animations
      .mockReturnValueOnce([{finished: opening.promise}])
      .mockReturnValueOnce([{finished: closing.promise}])
    render(Harness)
    fireEvent.click(screen.getByRole('button', {name: 'expand'}))
    vi.advanceTimersToNextFrame()
    fireEvent.click(screen.getByRole('button', {name: 'close'}))
    opening.reject(new Error('Transition reversed'))
    await waitFor(() =>
      expect(screen.getByRole('group')).toHaveAttribute('data-phase', 'collapsing'),
    )
    expect(close).not.toHaveBeenCalled()
    closing.resolve()
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
  })

  it('should skip travel when reduced motion is requested', () => {
    reduced = true
    render(Harness)
    fireEvent.click(screen.getByRole('button', {name: 'expand'}))
    expect(screen.getByRole('group')).toHaveAttribute('data-phase', 'expanded')
    expect(vi.getTimerCount()).toBe(0)
    fireEvent.click(screen.getByRole('button', {name: 'close'}))
    expect(close).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should cancel a queued opening when closed before its first frame', () => {
    render(Harness)
    fireEvent.click(screen.getByRole('button', {name: 'expand'}))
    expect(vi.getTimerCount()).toBe(1)
    fireEvent.click(screen.getByRole('button', {name: 'close'}))
    expect(vi.getTimerCount()).toBe(0)
    expect(close).toHaveBeenCalledOnce()
    vi.advanceTimersToNextFrame()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should cancel queued frames when unmounted', () => {
    const view = render(Harness)
    fireEvent.click(screen.getByRole('button', {name: 'expand'}))
    expect(vi.getTimerCount()).toBe(1)
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
    expect(close).not.toHaveBeenCalled()
  })
})
