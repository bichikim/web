/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'
import {browserWakeLock} from '../browser-wake-lock'

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock')
  vi.restoreAllMocks()
})

it('should detect support and forward screen requests with the platform receiver', () => {
  expect(browserWakeLock.isSupported()).toBe(false)
  const promise = Promise.withResolvers<WakeLockSentinel>().promise
  const request = vi.fn(() => promise)
  const wakeLock = {request}
  Object.defineProperty(navigator, 'wakeLock', {configurable: true, value: wakeLock})
  expect(browserWakeLock.isSupported()).toBe(true)
  expect(browserWakeLock.request()).toBe(promise)
  expect(request).toHaveBeenCalledWith('screen')
  expect(request.mock.contexts).toEqual([wakeLock])
})

it('should reject incomplete browser support', () => {
  Object.defineProperty(navigator, 'wakeLock', {configurable: true, value: {}})
  expect(browserWakeLock.isSupported()).toBe(false)
})

it('should read visibility and unsubscribe document events', () => {
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  expect(browserWakeLock.isVisible()).toBe(false)
  visibility.mockReturnValue('visible')
  expect(browserWakeLock.isVisible()).toBe(true)
  const onChange = vi.fn()
  const unsubscribe = browserWakeLock.subscribeVisibility(onChange)
  document.dispatchEvent(new Event('visibilitychange'))
  expect(onChange).toHaveBeenCalledOnce()
  unsubscribe()
  document.dispatchEvent(new Event('visibilitychange'))
  expect(onChange).toHaveBeenCalledOnce()
})
