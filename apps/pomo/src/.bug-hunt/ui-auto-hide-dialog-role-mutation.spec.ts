/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {createInactivityController} from '../features/ui-auto-hide/create-inactivity-controller'

const hasVisibleDialog = () =>
  Array.from(document.querySelectorAll('[role="dialog"], dialog[open], [role="alertdialog"]')).some(
    (dialog) => dialog.getClientRects().length > 0,
  )

const setup = () => {
  let hidden = false
  let expire = () => {}
  const dispose = createRoot((disposeRoot) => {
    const controller = createInactivityController({
      enabled: () => true,
      isBlocked: hasVisibleDialog,
      isSuspended: () => document.visibilityState === 'hidden',
      onHiddenChange: (value) => {
        hidden = value
      },
      schedule: (callback) => {
        expire = callback
        return () => undefined
      },
      seconds: () => 30,
    })
    const observer = new MutationObserver(() => {
      if (hasVisibleDialog()) {
        controller.wake()
      }
    })
    observer.observe(document.body, {
      attributeFilter: ['aria-hidden', 'hidden', 'open'],
      attributes: true,
      childList: true,
      subtree: true,
    })
    controller.wake()
    return () => {
      observer.disconnect()
      controller.dispose()
      disposeRoot()
    }
  })
  return {dispose, expire, hidden: () => hidden}
}

afterEach(() => {
  document.body.replaceChildren()
  vi.useRealTimers()
})

it('should reveal chrome when a dialog node is appended with role already set', async () => {
  vi.useFakeTimers()
  const view = setup()
  view.expire()
  expect(view.hidden()).toBe(true)

  const modal = document.createElement('div')
  modal.setAttribute('role', 'dialog')
  vi.spyOn(modal, 'getClientRects').mockReturnValue({length: 1} as DOMRectList)
  document.body.append(modal)
  await Promise.resolve()

  expect(view.hidden()).toBe(false)
  view.dispose()
})

it('should reveal chrome when an existing node becomes a visible dialog after auto-hide', async () => {
  vi.useFakeTimers()
  const view = setup()
  view.expire()
  expect(view.hidden()).toBe(true)

  const modal = document.createElement('div')
  vi.spyOn(modal, 'getClientRects').mockReturnValue({length: 1} as DOMRectList)
  document.body.append(modal)
  await Promise.resolve()
  modal.setAttribute('role', 'dialog')
  await Promise.resolve()

  expect(view.hidden()).toBe(false)
  view.dispose()
})
