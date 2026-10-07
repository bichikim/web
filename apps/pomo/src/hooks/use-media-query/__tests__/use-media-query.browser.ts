import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {commands, page} from 'vitest/browser'

import {useMediaQuery} from '..'

declare module 'vitest/browser' {
  interface BrowserCommands {
    setColorScheme: (colorScheme: 'light' | 'dark') => Promise<void>
  }
}

interface QueryChange {
  readonly isMediaQueryEvent: boolean
  readonly isTrusted: boolean
  readonly matches: boolean
}

const WIDE_VIEWPORT_WIDTH = 1000
const NARROW_VIEWPORT_WIDTH = 400
const VIEWPORT_HEIGHT = 700

let removeObserver: (() => void) | undefined

const observeQuery = (query: string) => {
  const mediaQuery = globalThis.matchMedia(query)
  const events: QueryChange[] = []
  // Snapshot at dispatch: retained Chromium event objects can expose later matches.
  const recordChange = (event: MediaQueryListEvent) =>
    events.push({
      isMediaQueryEvent: event instanceof MediaQueryListEvent,
      isTrusted: event.isTrusted,
      matches: event.matches,
    })
  mediaQuery.addEventListener('change', recordChange)
  removeObserver = () => mediaQuery.removeEventListener('change', recordChange)
  return {events, mediaQuery}
}

beforeEach(async () => {
  await page.viewport(WIDE_VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
  await commands.setColorScheme('light')
})

afterEach(() => {
  cleanup()
  removeObserver?.()
  removeObserver = undefined
})

it('should retain boolean matches on native viewport changes and stop observing after disposal', async () => {
  const query = '(max-width: 600px)'
  const {events, mediaQuery} = observeQuery(query)
  const {cleanup: dispose, result} = renderHook(() => useMediaQuery(query))
  expect(result()).toBe(false)

  await page.viewport(NARROW_VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
  await expect.poll(() => events.map((event) => event.matches)).toEqual([true])
  await expect.poll(result).toBe(true)
  expect(mediaQuery.matches).toBe(true)
  expect(events[0]?.isMediaQueryEvent).toBe(true)
  expect(events[0]?.isTrusted).toBe(true)

  await page.viewport(WIDE_VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
  await expect.poll(() => events.map((event) => event.matches)).toEqual([true, false])
  await expect.poll(result).toBe(false)

  dispose()
  await page.viewport(NARROW_VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
  await expect.poll(() => events.map((event) => event.matches)).toEqual([true, false, true])
  expect(result()).toBe(false)
})

it('should retain boolean matches on native system color-scheme changes', async () => {
  const query = '(prefers-color-scheme: dark)'
  const {events, mediaQuery} = observeQuery(query)
  const {result} = renderHook(() => useMediaQuery(query))
  expect(result()).toBe(false)

  await commands.setColorScheme('dark')
  await expect.poll(() => events.map((event) => event.matches)).toEqual([true])
  await expect.poll(result).toBe(true)
  expect(mediaQuery.matches).toBe(true)
  expect(events[0]?.isMediaQueryEvent).toBe(true)
  expect(events[0]?.isTrusted).toBe(true)

  await commands.setColorScheme('light')
  await expect.poll(() => events.map((event) => event.matches)).toEqual([true, false])
  await expect.poll(result).toBe(false)
})
