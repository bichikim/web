/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {EditorTooltip} from '../EditorTooltip'

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover')
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('should describe an icon after hover delay and dismiss on Escape', () => {
  vi.useFakeTimers()
  vi.stubGlobal('PointerEvent', MouseEvent)
  vi.stubGlobal('CSS', {supports: () => true})
  HTMLElement.prototype.showPopover = vi.fn()
  HTMLElement.prototype.hidePopover = vi.fn()
  const view = render(() => (
    <main>
      <button aria-label="화면 맞춤">□</button>
      <EditorTooltip />
    </main>
  ))
  const button = view.getByRole('button')
  fireEvent.pointerOver(button)
  vi.advanceTimersByTime(399)
  expect(view.queryByRole('tooltip')).toBeNull()
  vi.advanceTimersByTime(1)
  expect(view.getByRole('tooltip')).toHaveTextContent('화면 맞춤')
  expect(button).toHaveAttribute('aria-describedby')
  fireEvent.keyDown(button, {key: 'Escape'})
  expect(view.queryByRole('tooltip')).toBeNull()
  expect(button).not.toHaveAttribute('aria-describedby')
})

test('should prefer explanatory text and preserve existing descriptions', () => {
  vi.useFakeTimers()
  vi.stubGlobal('PointerEvent', MouseEvent)
  vi.stubGlobal('CSS', {supports: () => true})
  HTMLElement.prototype.showPopover = vi.fn()
  HTMLElement.prototype.hidePopover = vi.fn()
  const view = render(() => (
    <main>
      <button aria-label="추가" data-tooltip="현재 값에 키폼 추가" aria-describedby="existing">
        +
      </button>
      <EditorTooltip />
    </main>
  ))
  const button = view.getByRole('button')
  fireEvent.pointerOver(button)
  vi.advanceTimersByTime(400)
  expect(view.getByRole('tooltip')).toHaveTextContent('현재 값에 키폼 추가')
  fireEvent.pointerDown(button)
  expect(button).toHaveAttribute('aria-describedby', 'existing')
})
