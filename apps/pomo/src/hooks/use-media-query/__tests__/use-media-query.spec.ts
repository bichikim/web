/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {createRenderEffect} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {useMediaQuery} from '..'

const query = '(prefers-reduced-motion: reduce)'

const mockMediaQuery = (initialMatches: boolean) => {
  const target = new EventTarget()
  const mediaQuery = Object.assign(target, {matches: initialMatches, media: query})
  const addListener = vi.spyOn(mediaQuery, 'addEventListener')
  const removeListener = vi.spyOn(mediaQuery, 'removeEventListener')
  const matchMedia = vi.fn(() => mediaQuery)
  vi.stubGlobal('matchMedia', matchMedia)

  const change = (matches: boolean) => {
    mediaQuery.matches = matches
    const event = Object.assign(new Event('change'), {matches})
    mediaQuery.dispatchEvent(event)
  }

  return {addListener, change, matchMedia, removeListener}
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should preserve the initial render value until mounting and then read the media query', () => {
  const {matchMedia} = mockMediaQuery(true)
  const values: boolean[] = []
  const {result} = renderHook(() => {
    const matches = useMediaQuery(query)
    expect(matchMedia).not.toHaveBeenCalled()
    createRenderEffect(() => values.push(matches()))
    return matches
  })

  expect(values).toEqual([false, true])
  expect(result()).toBe(true)
  expect(matchMedia).toHaveBeenCalledExactlyOnceWith(query)
})

it('should replace a custom initial value with the mounted query result', () => {
  mockMediaQuery(false)
  const values: boolean[] = []
  const {result} = renderHook(() => {
    const matches = useMediaQuery(query, {initialValue: true})
    createRenderEffect(() => values.push(matches()))
    return matches
  })

  expect(values).toEqual([true, false])
  expect(result()).toBe(false)
})

it('should follow query changes and remove its listener when disposed', () => {
  const {addListener, change, removeListener} = mockMediaQuery(false)
  const {cleanup: dispose, result} = renderHook(() => useMediaQuery(query))

  expect(addListener).toHaveBeenCalledExactlyOnceWith('change', expect.any(Function))
  change(true)
  expect(result()).toBe(true)
  change(false)
  expect(result()).toBe(false)

  dispose()
  expect(removeListener).toHaveBeenCalledExactlyOnceWith('change', addListener.mock.calls[0][1])
  change(true)
  expect(result()).toBe(false)
})

it.each([false, true])(
  'should keep initialValue=%s when matchMedia is unavailable',
  (initialValue) => {
    vi.stubGlobal('matchMedia', undefined)
    const {result} = renderHook(() => useMediaQuery(query, {initialValue}))

    expect(result()).toBe(initialValue)
  },
)

it('should use false when matchMedia and an initial value are both absent', () => {
  vi.stubGlobal('matchMedia', undefined)
  const {result} = renderHook(() => useMediaQuery(query))

  expect(result()).toBe(false)
})
