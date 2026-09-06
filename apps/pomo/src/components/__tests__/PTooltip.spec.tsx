/** @vitest-environment jsdom */

import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'
import {PTooltip} from '../PTooltip'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('CSS', {supports: () => true})
  vi.stubGlobal('PointerEvent', MouseEvent)
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover')
})

const renderTooltip = () =>
  render(() => (
    <PTooltip label="설정 열기">
      {(trigger) => (
        <button {...trigger} type="button">
          설정
        </button>
      )}
    </PTooltip>
  ))

it('should open after hovering and connect the description without moving focus', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  fireEvent.pointerEnter(button)
  vi.advanceTimersByTime(399)
  expect(button).not.toHaveAttribute('aria-describedby')
  vi.advanceTimersByTime(1)
  const tooltip = result.getByRole('tooltip')
  expect(tooltip).toHaveTextContent('설정 열기')
  expect(tooltip).toHaveAttribute('popover', 'manual')
  expect(button).toHaveAttribute('aria-describedby', tooltip.id)
  expect(tooltip.showPopover).toHaveBeenCalled()
  expect(button).not.toHaveFocus()
})

it('should cancel a pending hover when the pointer leaves', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  fireEvent.pointerEnter(button)
  fireEvent.pointerLeave(button)
  vi.advanceTimersByTime(1000)
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should remain open while moving onto the tooltip and dismiss with Escape', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  fireEvent.pointerEnter(button)
  vi.advanceTimersByTime(400)
  fireEvent.pointerLeave(button)
  fireEvent.pointerEnter(result.getByRole('tooltip'))
  vi.advanceTimersByTime(500)
  expect(button).toHaveAttribute('aria-describedby')
  fireEvent.keyDown(document, {key: 'Escape'})
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should open on keyboard focus and close on blur or activation', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  fireEvent.focus(button)
  expect(button).toHaveAttribute('aria-describedby')
  fireEvent.blur(button)
  vi.advanceTimersByTime(150)
  expect(button).not.toHaveAttribute('aria-describedby')
  fireEvent.focus(button)
  fireEvent.click(button)
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should close the previous tooltip when another trigger is focused', () => {
  const result = render(() => (
    <>
      <PTooltip label="첫 번째">{(trigger) => <button {...trigger}>첫째</button>}</PTooltip>
      <PTooltip label="두 번째">{(trigger) => <button {...trigger}>둘째</button>}</PTooltip>
    </>
  ))
  const buttons = result.getAllByRole('button')
  fireEvent.focus(buttons[0]!)
  fireEvent.focus(buttons[1]!)
  expect(buttons[0]).not.toHaveAttribute('aria-describedby')
  expect(buttons[1]).toHaveAttribute('aria-describedby')
})

it('should preserve touch activation without opening a tooltip', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  const event = new Event('pointerenter')
  Object.defineProperty(event, 'pointerType', {value: 'touch'})
  fireEvent(button, event)
  fireEvent.pointerDown(button)
  fireEvent.focus(button)
  vi.advanceTimersByTime(500)
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should provide a native title when top-layer anchor positioning is unavailable', () => {
  vi.stubGlobal('CSS', {supports: () => false})
  const result = renderTooltip()
  const button = result.getByRole('button')
  expect(button).toHaveAttribute('title', '설정 열기')
  fireEvent.focus(button)
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should clear pending work when unmounted', () => {
  const result = renderTooltip()
  fireEvent.pointerEnter(result.getByRole('button'))
  result.unmount()
  expect(vi.getTimerCount()).toBe(0)
})

it('should keep a focused tooltip visible when the mouse enters its trigger', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  fireEvent.focus(button)
  fireEvent.pointerEnter(button)
  expect(button).toHaveAttribute('aria-describedby')
  fireEvent.pointerLeave(button)
  vi.advanceTimersByTime(500)
  expect(button).toHaveAttribute('aria-describedby')
})

it('should update the visible description when the action label changes', () => {
  const [label, setLabel] = createSignal('시작')
  const result = render(() => (
    <PTooltip label={label()}>{(trigger) => <button {...trigger}>타이머</button>}</PTooltip>
  ))
  fireEvent.focus(result.getByRole('button'))
  setLabel('일시 정지')
  expect(result.getByRole('tooltip')).toHaveTextContent('일시 정지')
})

it('should cancel showing a trigger that becomes disabled during the hover delay', () => {
  const [disabled, setDisabled] = createSignal(false)
  const result = render(() => (
    <PTooltip label="이전 곡">
      {(trigger) => (
        <button {...trigger} disabled={disabled()}>
          이전
        </button>
      )}
    </PTooltip>
  ))
  const button = result.getByRole('button')
  fireEvent.pointerEnter(button)
  setDisabled(true)
  vi.advanceTimersByTime(400)
  expect(button).not.toHaveAttribute('aria-describedby')
  fireEvent.pointerEnter(button)
  vi.advanceTimersByTime(400)
  expect(button).not.toHaveAttribute('aria-describedby')
})

it('should close on scroll and remove global listeners on unmount', () => {
  const result = renderTooltip()
  const button = result.getByRole('button')
  fireEvent.focus(button)
  fireEvent.scroll(document)
  expect(button).not.toHaveAttribute('aria-describedby')
  fireEvent.focus(button)
  result.unmount()
  const escape = new KeyboardEvent('keydown', {cancelable: true, key: 'Escape'})
  document.dispatchEvent(escape)
  expect(escape.defaultPrevented).toBe(false)
  expect(vi.getTimerCount()).toBe(0)
})

it('should write anchor and description attributes onto custom media elements', () => {
  const result = render(() => (
    <PTooltip label="재생 또는 일시 정지">
      {(trigger) => <media-play-button {...trigger} />}
    </PTooltip>
  ))
  const button = result.container.querySelector('media-play-button')!
  expect(button).toHaveAttribute('data-pomo-tooltip-trigger', '')
  fireEvent.focus(button)
  expect(button).toHaveAttribute('aria-describedby', result.getByRole('tooltip').id)
  fireEvent.blur(button)
  vi.advanceTimersByTime(150)
  expect(button).not.toHaveAttribute('aria-describedby')
})
