import {getWindow} from 'src/browser/dom/get-window'
import {requestIdleCallbackPolyfill} from './polyfill'

export const requestIdleCallback = (
  callback: IdleRequestCallback,
  options?: IdleRequestOptions,
): (() => void) => {
  const window = getWindow()

  if (window?.requestIdleCallback === undefined) {
    return requestIdleCallbackPolyfill(callback, options)
  }

  const id = window.requestIdleCallback(callback, options)

  return () => {
    if (typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(id)
    }
  }
}
