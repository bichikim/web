/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {STooltip} from '../STooltip'

const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
const Trigger = () => (
  <STooltip content="설정">
    {(description) => <button aria-describedby={description}>도구</button>}
  </STooltip>
)
const enter = (trigger: HTMLElement) => fireEvent.pointerOver(trigger, {pointerType: 'mouse'})
const leave = (trigger: HTMLElement, relatedTarget: EventTarget | null = null) =>
  fireEvent(trigger, new MouseEvent('pointerout', {bubbles: true, relatedTarget}))

describe('STooltip', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: vi.fn(),
    })
  })
  afterEach(() => {
    cleanup()
    if (originalPopover === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
    } else {
      Object.defineProperty(HTMLElement.prototype, 'showPopover', originalPopover)
    }
  })
  it('should describe its trigger on hover and close when the pointer moves into the tooltip', () => {
    render(Trigger)
    const trigger = screen.getByRole('button', {name: '도구'})
    expect(screen.queryByRole('tooltip')).toBeNull()
    enter(trigger)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.textContent).toBe('설정')
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id)
    expect(tooltip.showPopover).toHaveBeenCalled()
    leave(trigger, tooltip)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
  it('should let pointer input pass through the tooltip and close when moving into its text', () => {
    render(Trigger)
    const trigger = screen.getByRole('button', {name: '도구'})
    enter(trigger)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveClass('pointer-events-none')
    leave(trigger, screen.getByText('설정'))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
  it('should remain visible when the pointer moves between parts of its trigger', () => {
    render(() => (
      <STooltip content="설정">
        {(description) => (
          <button aria-describedby={description}>
            <span>도구</span>
          </button>
        )}
      </STooltip>
    ))
    const trigger = screen.getByRole('button', {name: '도구'})
    enter(trigger)
    leave(trigger, screen.getByText('도구'))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })
  it('should show for keyboard focus and retain focus when Escape dismisses it', () => {
    render(Trigger)
    const trigger = screen.getByRole('button', {name: '도구'})
    trigger.focus()
    expect(screen.getByRole('tooltip').textContent).toBe('설정')
    expect(document.activeElement).toBe(trigger)
    fireEvent.keyDown(document, {key: 'Escape'})
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    trigger.blur()
    trigger.focus()
    expect(screen.getByRole('tooltip')).toBeTruthy()
    trigger.blur()
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
  it('should dismiss a mouse tooltip with Escape without forwarding it to the containing dialog', () => {
    const dismissed = vi.fn()
    document.addEventListener('keydown', dismissed)
    render(Trigger)
    const trigger = screen.getByRole('button', {name: '도구'})
    enter(trigger)
    fireEvent.keyDown(document, {key: 'Escape'})
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(dismissed).not.toHaveBeenCalled()
    fireEvent.keyDown(document, {key: 'Escape'})
    expect(dismissed).toHaveBeenCalledOnce()
    leave(trigger)
    enter(trigger)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    cleanup()
    fireEvent.keyDown(document, {key: 'Escape'})
    expect(dismissed).toHaveBeenCalledTimes(2)
    document.removeEventListener('keydown', dismissed)
  })
  it('should dismiss when activated and preserve the original click action', () => {
    const clicked = vi.fn()
    render(() => (
      <STooltip content="설정">
        {(description) => (
          <button aria-describedby={description} onClick={clicked}>
            도구
          </button>
        )}
      </STooltip>
    ))
    const trigger = screen.getByRole('button', {name: '도구'})
    enter(trigger)
    fireEvent.pointerDown(trigger)
    fireEvent.click(trigger)
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(clicked).toHaveBeenCalledOnce()
  })
  it('should leave Escape available to an active input composition', () => {
    render(Trigger)
    enter(screen.getByRole('button', {name: '도구'}))
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      isComposing: true,
      key: 'Escape',
    })
    fireEvent(document, event)
    expect(event.defaultPrevented).toBe(false)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })
  it('should ignore touch hover and still describe disabled controls on mouse hover', () => {
    render(() => (
      <STooltip content="뒤로 이동">
        {(description) => (
          <button disabled aria-describedby={description}>
            도구
          </button>
        )}
      </STooltip>
    ))
    const trigger = screen.getByRole('button', {name: '도구'})
    const touch = new MouseEvent('pointerover', {bubbles: true})
    Object.defineProperty(touch, 'pointerType', {value: 'touch'})
    fireEvent(trigger, touch)
    expect(screen.queryByRole('tooltip')).toBeNull()
    enter(trigger)
    expect(screen.getByRole('tooltip').textContent).toBe('뒤로 이동')
  })
  it('should retain the keyboard hint when the pointer leaves its focused trigger', () => {
    render(Trigger)
    const trigger = screen.getByRole('button', {name: '도구'})
    trigger.focus()
    enter(trigger)
    leave(trigger)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    trigger.blur()
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
  it('should update translated content without recreating its trigger or reopening after Escape', () => {
    const [content, setContent] = createSignal('설정')
    render(() => (
      <STooltip content={content()}>
        {(description) => <button aria-describedby={description}>도구</button>}
      </STooltip>
    ))
    const trigger = screen.getByRole('button', {name: '도구'})
    enter(trigger)
    setContent('Settings')
    expect(screen.getByRole('tooltip').textContent).toBe('Settings')
    expect(screen.getByRole('button', {name: '도구'})).toBe(trigger)
    fireEvent.keyDown(document, {key: 'Escape'})
    setContent('설정')
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})
