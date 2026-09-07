/** @vitest-environment jsdom */

import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {AppsInToss} from '../AppsInToss'

const getInsets = vi.fn(() => ({bottom: 34, left: 8, right: 9, top: 47}))
const unsubscribe = vi.fn()
interface Insets {
  bottom: number
  left: number
  right: number
  top: number
}

const subscribe = vi.fn((_options: {onEvent: (insets: Insets) => void}) => unsubscribe)
const framework = {SafeAreaInsets: {get: getInsets, subscribe}}
let loading = Promise.withResolvers<typeof framework>()
const loadFramework = vi.fn(() => loading.promise)

beforeEach(() => {
  getInsets.mockReset().mockReturnValue({bottom: 34, left: 8, right: 9, top: 47})
  subscribe.mockReset().mockReturnValue(unsubscribe)
  vi.resetModules()
  loading = Promise.withResolvers<typeof framework>()
  vi.doMock('@apps-in-toss/web-framework', loadFramework)
})

afterEach(() => {
  cleanup()
  vi.doUnmock('@apps-in-toss/web-framework')
  vi.restoreAllMocks()
  vi.clearAllMocks()
  document.documentElement.removeAttribute('style')
})

it('should wait for the SDK before applying insets and subscribing once', async () => {
  const view = render(() => <AppsInToss />)
  await vi.waitFor(() => expect(loadFramework).toHaveBeenCalledOnce())

  expect(getInsets).not.toHaveBeenCalled()
  expect(subscribe).not.toHaveBeenCalled()
  expect(document.documentElement.style.cssText).toBe('')

  loading.resolve(framework)
  await vi.dynamicImportSettled()

  expect(getInsets).toHaveBeenCalledOnce()
  expect(subscribe).toHaveBeenCalledOnce()
  expect(document.documentElement.style.getPropertyValue('--pomo-safe-area-inset-left')).toBe('8px')

  view.unmount()
  expect(unsubscribe).toHaveBeenCalledOnce()
})

it('should ignore SDK resolution after disposal without writing styles or subscribing', async () => {
  const view = render(() => <AppsInToss />)
  await vi.waitFor(() => expect(loadFramework).toHaveBeenCalledOnce())
  view.unmount()

  loading.resolve(framework)
  await vi.dynamicImportSettled()

  expect(getInsets).not.toHaveBeenCalled()
  expect(subscribe).not.toHaveBeenCalled()
  expect(unsubscribe).not.toHaveBeenCalled()
  expect(document.documentElement.style.cssText).toBe('')
})

it('should report an SDK import rejection without applying insets or subscribing', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  render(() => <AppsInToss />)
  await vi.waitFor(() => expect(loadFramework).toHaveBeenCalledOnce())

  loading.reject(new Error('SDK import failed'))
  await vi.dynamicImportSettled()

  expect(consoleError).toHaveBeenCalledExactlyOnceWith(
    'Failed to synchronize Apps in Toss safe-area values.',
    expect.any(Error),
  )
  expect(getInsets).not.toHaveBeenCalled()
  expect(subscribe).not.toHaveBeenCalled()
  expect(document.documentElement.style.cssText).toBe('')
})

it('should ignore an SDK import rejection after disposal', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const view = render(() => <AppsInToss />)
  await vi.waitFor(() => expect(loadFramework).toHaveBeenCalledOnce())
  view.unmount()

  loading.reject(new Error('SDK import failed after disposal'))
  await vi.dynamicImportSettled()

  expect(consoleError).not.toHaveBeenCalled()
  expect(getInsets).not.toHaveBeenCalled()
  expect(subscribe).not.toHaveBeenCalled()
})

it('should apply native inset updates while excluding the Toss header', async () => {
  render(() => <AppsInToss />)
  await vi.waitFor(() => expect(loadFramework).toHaveBeenCalledOnce())
  loading.resolve(framework)
  await vi.dynamicImportSettled()

  expect(document.documentElement.style.getPropertyValue('--pomo-safe-area-inset-top')).toBe('0rem')
  expect(document.documentElement.style.getPropertyValue('--pomo-safe-area-inset-bottom')).toBe(
    '34px',
  )
  const [options] = subscribe.mock.calls[0]!
  options.onEvent({bottom: 21, left: 4, right: 6, top: 99})

  expect(document.documentElement.style.getPropertyValue('--pomo-safe-area-inset-top')).toBe('0rem')
  expect(document.documentElement.style.getPropertyValue('--pomo-safe-area-inset-bottom')).toBe(
    '21px',
  )
  expect(document.documentElement.style.getPropertyValue('--pomo-safe-area-inset-left')).toBe('4px')
  expect(document.documentElement.style.getPropertyValue('--pomo-safe-area-inset-right')).toBe(
    '6px',
  )
})

it.each(['get', 'subscribe'] as const)('should report a native %s failure', async (stage) => {
  const error = new Error('bridge unavailable')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  framework.SafeAreaInsets[stage].mockImplementation(() => {
    throw error
  })
  render(() => <AppsInToss />)
  await vi.waitFor(() => expect(loadFramework).toHaveBeenCalledOnce())
  loading.resolve(framework)
  await vi.dynamicImportSettled()

  expect(consoleError).toHaveBeenCalledExactlyOnceWith(
    'Failed to synchronize Apps in Toss safe-area values.',
    error,
  )
  if (stage === 'get') {
    expect(subscribe).not.toHaveBeenCalled()
  }
})
