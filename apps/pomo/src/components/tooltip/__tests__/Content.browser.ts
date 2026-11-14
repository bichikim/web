import {cleanup, render, screen} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PTooltipContent} from '../Content'
import {tooltipContext, type TooltipRequest} from '../context'

afterEach(cleanup)

const renderContent = () => {
  const [active, setActive] = createSignal<TooltipRequest>()
  const close = vi.fn(() => setActive(undefined))
  const result = render(() =>
    createComponent(tooltipContext.Provider, {
      get children() {
        return createComponent(PTooltipContent, {})
      },
      value: {
        active,
        cancelClose: vi.fn(),
        close,
        dismiss: vi.fn(),
        present: setActive,
        scheduleClose: vi.fn(),
        supported: () => true,
      },
    }),
  )
  const present = (target: HTMLElement) =>
    setActive({owner: target.textContent ?? '', target, text: () => '설명'})
  return {...result, close, present}
}

it.each(['keydown', 'pointerdown', 'click', 'scroll', 'blur', 'resize'])(
  'should release the native %s listener on close, reopen and disposal',
  (type) => {
    const content = renderContent()
    const target = document.createElement('button')
    content.container.append(target)
    const eventTarget = type === 'blur' || type === 'resize' ? globalThis : target
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
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.matches(':popover-open')).toBe(true)

    const firstEvent = dispatch()

    expect(content.close).toHaveBeenCalledOnce()
    expect(firstEvent.defaultPrevented).toBe(type === 'keydown')
    expect(tooltip.matches(':popover-open')).toBe(false)
    dispatch()
    expect(content.close).toHaveBeenCalledOnce()
    content.present(target)
    expect(tooltip.matches(':popover-open')).toBe(true)
    dispatch()
    expect(content.close).toHaveBeenCalledTimes(2)
    content.present(target)
    content.unmount()
    expect(dispatch().defaultPrevented).toBe(false)
    expect(content.close).toHaveBeenCalledTimes(2)
  },
)

it('should preserve Escape propagation for an unrelated native modal and consume it inside the modal', () => {
  const content = renderContent()
  const outside = document.createElement('button')
  const dialog = document.createElement('dialog')
  const inside = document.createElement('button')
  dialog.append(inside)
  content.container.append(outside, dialog)
  const onDialogKey = vi.fn()
  dialog.addEventListener('keydown', onDialogKey)
  content.present(outside)
  dialog.showModal()

  const outsideEscape = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Escape',
  })
  inside.dispatchEvent(outsideEscape)

  expect(content.close).toHaveBeenCalledOnce()
  expect(outsideEscape.defaultPrevented).toBe(false)
  expect(onDialogKey).toHaveBeenCalledOnce()
  content.present(inside)
  const insideEscape = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Escape',
  })
  inside.dispatchEvent(insideEscape)
  expect(content.close).toHaveBeenCalledTimes(2)
  expect(insideEscape.defaultPrevented).toBe(true)
  expect(onDialogKey).toHaveBeenCalledOnce()
  expect(dialog.matches(':modal')).toBe(true)
  dialog.close()
})

it('should move the listener session to the replacement trigger document', async () => {
  const content = renderContent()
  const first = document.createElement('button')
  const frame = document.createElement('iframe')
  const loaded = new Promise<void>((resolve) => {
    frame.addEventListener('load', () => resolve(), {once: true})
  })
  content.container.append(first, frame)
  await loaded
  const second = frame.contentDocument!.createElement('button')
  frame.contentDocument!.body.append(second)
  content.present(first)

  content.present(second)

  expect(first.hasAttribute('aria-describedby')).toBe(false)
  expect(second.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id)
  globalThis.dispatchEvent(new Event('resize'))
  expect(content.close).not.toHaveBeenCalled()
  frame.contentWindow!.dispatchEvent(new Event('resize'))
  expect(content.close).toHaveBeenCalledOnce()
  expect(second.hasAttribute('aria-describedby')).toBe(false)
  frame.contentWindow!.dispatchEvent(new Event('resize'))
  expect(content.close).toHaveBeenCalledOnce()
})
