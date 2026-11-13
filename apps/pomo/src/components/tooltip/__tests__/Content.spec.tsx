/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PTooltipContent} from '../Content'
import {tooltipContext, type TooltipRequest} from '../context'
import {installTooltipBrowser} from './support/browser'

let browser: ReturnType<typeof installTooltipBrowser>

beforeEach(() => {
  browser = installTooltipBrowser()
})

afterEach(() => {
  cleanup()
  browser.restore()
  vi.restoreAllMocks()
})

const renderContent = () => {
  const [active, setActive] = createSignal<TooltipRequest>()
  const close = vi.fn()
  const result = render(() => (
    <tooltipContext.Provider
      value={{
        active,
        cancelClose: vi.fn(),
        close,
        dismiss: vi.fn(),
        present: setActive,
        scheduleClose: vi.fn(),
        supported: () => true,
      }}
    >
      <button type="button">첫째</button>
      <button type="button">둘째</button>
      <PTooltipContent />
    </tooltipContext.Provider>
  ))
  const present = (target: HTMLElement) =>
    setActive({owner: target.textContent ?? '', target, text: () => '설명'})

  return {...result, close, present, setActive}
}

it.each(['keydown', 'pointerdown', 'click', 'scroll', 'blur', 'resize'])(
  'should close on %s and release its listener when the content session ends',
  (type) => {
    const content = renderContent()
    const target = screen.getByRole('button', {name: '첫째'})
    const eventTarget =
      type === 'blur' || type === 'resize' ? globalThis : type === 'keydown' ? document : target
    const dispatch = () => {
      const event =
        type === 'keydown'
          ? new KeyboardEvent(type, {bubbles: true, cancelable: true, key: 'Escape'})
          : new Event(type, {bubbles: true})
      eventTarget.dispatchEvent(event)
      return event
    }
    target.addEventListener(type, (event) => event.stopPropagation())
    content.present(target)

    const firstEvent = dispatch()

    expect(content.close).toHaveBeenCalledOnce()
    expect(firstEvent.defaultPrevented).toBe(type === 'keydown')
    content.setActive(undefined)
    dispatch()
    expect(content.close).toHaveBeenCalledOnce()

    content.present(target)
    dispatch()
    expect(content.close).toHaveBeenCalledTimes(2)
    content.unmount()
    const lastEvent = dispatch()
    expect(content.close).toHaveBeenCalledTimes(2)
    expect(lastEvent.defaultPrevented).toBe(false)
  },
)

it('should replace the listener session while restoring the previous trigger attributes', () => {
  const content = renderContent()
  const first = screen.getByRole('button', {name: '첫째'})
  const second = screen.getByRole('button', {name: '둘째'})
  first.setAttribute('aria-describedby', 'existing-description')
  first.setAttribute('data-pomo-tooltip-trigger', 'existing-trigger')
  first.style.setProperty('--pomo-tooltip-anchor', '--existing-anchor')
  content.present(first)
  const tooltip = screen.getByRole('tooltip')
  expect(first).toHaveAttribute('aria-describedby', `existing-description ${tooltip.id}`)

  content.present(second)

  expect(first).toHaveAttribute('aria-describedby', 'existing-description')
  expect(first).toHaveAttribute('data-pomo-tooltip-trigger', 'existing-trigger')
  expect(first.style.getPropertyValue('--pomo-tooltip-anchor')).toBe('--existing-anchor')
  expect(second).toHaveAttribute('aria-describedby', tooltip.id)
  const escape = new KeyboardEvent('keydown', {cancelable: true, key: 'Escape'})
  document.dispatchEvent(escape)
  expect(content.close).toHaveBeenCalledOnce()
  expect(escape.defaultPrevented).toBe(true)

  content.unmount()

  expect(second).not.toHaveAttribute('aria-describedby')
  expect(second).not.toHaveAttribute('data-pomo-tooltip-trigger')
  expect(second.style.getPropertyValue('--pomo-tooltip-anchor')).toBe('')
})
