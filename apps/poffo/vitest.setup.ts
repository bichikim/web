import {configure} from '@solidjs/testing-library'
import {flush, resetErrorHalt} from 'solid-js'
import {afterEach, vi} from 'vitest'

// Synchronous DOM events settle staged Solid writes before the next assertion.
configure({eventWrapper: (dispatch) => flush(dispatch)})
if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.scrollIntoView ??= vi.fn()
  // jsdom 26 does not reflect the standard inert attribute to the DOM property.
  if (!Object.hasOwn(HTMLElement.prototype, 'inert')) {
    Object.defineProperty(HTMLElement.prototype, 'inert', {
      configurable: true,
      get(this: HTMLElement) {
        return this.hasAttribute('inert')
      },
      set(this: HTMLElement, value: boolean) {
        this.toggleAttribute('inert', value)
      },
    })
  }
}
afterEach(() => resetErrorHalt())
