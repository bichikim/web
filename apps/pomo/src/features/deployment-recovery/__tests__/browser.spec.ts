import {afterEach, expect, it, vi} from 'vitest'

import {installPreloadErrorRecovery} from '..'

const SESSION_KEY = 'pomo:preload-recovery:v1'

const installBrowserRuntime = () => {
  let listener: ((event: Event) => void) | null = null
  let scheduledClear: (() => void) | null = null
  const storage = new Map<string, string>()
  const clearTimeout = vi.fn()
  const reload = vi.fn()
  const removeEventListener = vi.fn()
  const setTimeout = vi.fn((callback: () => void) => {
    scheduledClear = callback
    return 17
  })

  vi.stubGlobal('window', {
    addEventListener: vi.fn((_type: string, nextListener: (event: Event) => void) => {
      listener = nextListener
    }),
    clearTimeout,
    location: {reload},
    removeEventListener,
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    },
    setTimeout,
  })

  return {
    clearTimeout,
    emitPreloadError: () => {
      const event = new Event('vite:preloadError', {cancelable: true})
      listener?.(event)
      return event
    },
    reload,
    removeEventListener,
    runScheduledClear: () => scheduledClear?.(),
    setTimeout,
    storage,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should install guarded reload behavior through the public browser API', () => {
  const browser = installBrowserRuntime()
  const registration = installPreloadErrorRecovery()

  const event = browser.emitPreloadError()
  registration.markAppStarted()

  expect(event.defaultPrevented).toBe(true)
  expect(browser.reload).toHaveBeenCalledOnce()
  expect(browser.storage.has(SESSION_KEY)).toBe(true)
  expect(browser.setTimeout).not.toHaveBeenCalled()
})

it('should clear a stable session guard and dispose browser resources', () => {
  const browser = installBrowserRuntime()
  browser.storage.set(SESSION_KEY, 'guard')
  const registration = installPreloadErrorRecovery()

  registration.markAppStarted()
  browser.runScheduledClear()
  registration.dispose()

  expect(browser.setTimeout).toHaveBeenCalledWith(expect.any(Function), 10_000)
  expect(browser.storage.has(SESSION_KEY)).toBe(false)
  expect(browser.removeEventListener).toHaveBeenCalledWith(
    'vite:preloadError',
    expect.any(Function),
  )
  expect(browser.clearTimeout).toHaveBeenCalledWith(17)
})
