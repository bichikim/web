/** @vitest-environment jsdom */
import {expect, test} from 'vitest'
import {preventInternalDismiss} from '../prevent-internal-dismiss'

const dispatch = (target: HTMLElement, surface: HTMLElement): boolean => {
  let prevented = false
  const handler = (originalEvent: Event) =>
    preventInternalDismiss(
      {
        detail: {originalEvent},
        preventDefault: () => {
          prevented = true
        },
      },
      surface,
    )
  document.addEventListener('focusin', handler)
  target.dispatchEvent(new FocusEvent('focusin', {bubbles: true, composed: true}))
  document.removeEventListener('focusin', handler)
  return prevented
}

test('should preserve internal focus and trigger interaction inside a shadow root', () => {
  const host = document.createElement('div')
  const shadow = host.attachShadow({mode: 'open'})
  const surface = document.createElement('div')
  const input = document.createElement('input')
  const trigger = document.createElement('button')
  surface.id = 'popup'
  trigger.setAttribute('aria-controls', surface.id)
  surface.append(input)
  shadow.append(trigger, surface)
  document.body.append(host)
  expect(dispatch(input, surface)).toBe(true)
  expect(dispatch(trigger, surface)).toBe(true)
  host.remove()
})

test('should keep outside focus dismissible within and outside the shadow root', () => {
  const host = document.createElement('div')
  const shadow = host.attachShadow({mode: 'open'})
  const surface = document.createElement('div')
  const outside = document.createElement('button')
  const external = document.createElement('button')
  shadow.append(surface, outside)
  document.body.append(host, external)
  expect(dispatch(outside, surface)).toBe(false)
  expect(dispatch(external, surface)).toBe(false)
  host.remove()
  external.remove()
})
