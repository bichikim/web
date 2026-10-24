/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createRenderEffect} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {usePreference} from '..'
import {PreferenceProvider} from 'src/hooks/use-preference'

const key = 'test:preference'
const parseNumber = (value: unknown) => (typeof value === 'number' ? value : null)
const options = {defaultValue: 10, key, parse: parseNumber}

beforeEach(() => globalThis.localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should expose null until mounting and then restore a stored zero', () => {
  globalThis.localStorage.setItem(key, '0')
  const values: Array<number | null> = []
  const {result} = renderHook(
    () => {
      const [value, setValue] = usePreference(options)
      createRenderEffect(() => values.push(value()))
      return [value, setValue] as const
    },
    {wrapper: PreferenceProvider},
  )
  expect(values).toEqual([null, 0])
  expect(result[0]()).toBe(0)
})

it('should restore the default for missing or invalid stored values', () => {
  expect(renderHook(() => usePreference(options), {wrapper: PreferenceProvider}).result[0]()).toBe(
    10,
  )
  globalThis.localStorage.setItem(key, '"invalid"')
  expect(renderHook(() => usePreference(options), {wrapper: PreferenceProvider}).result[0]()).toBe(
    10,
  )
})

it('should persist and synchronize object preferences between mounted consumers', () => {
  interface Preference {
    readonly label: string
  }
  const parse = (value: unknown): Preference | null => {
    if (typeof value !== 'object' || value === null || !('label' in value)) {
      return null
    }
    return typeof value.label === 'string' ? {label: value.label} : null
  }
  const configuration = {defaultValue: {label: 'default'}, key, parse}
  const {
    result: [first, second],
  } = renderHook(() => [usePreference(configuration), usePreference(configuration)] as const, {
    wrapper: PreferenceProvider,
  })
  const dispatch = vi.spyOn(globalThis, 'dispatchEvent')
  first[1]({label: 'updated'})
  expect(dispatch).not.toHaveBeenCalled()
  expect(second[0]()).toEqual({label: 'updated'})
  expect(JSON.parse(globalThis.localStorage.getItem(key) ?? 'null')).toEqual({label: 'updated'})
})

it('should refresh on matching storage changes and clear events, then unsubscribe on disposal', () => {
  const {result, cleanup: dispose} = renderHook(() => usePreference(options), {
    wrapper: PreferenceProvider,
  })
  globalThis.localStorage.setItem(key, '25')
  globalThis.dispatchEvent(new StorageEvent('storage', {key: 'unrelated'}))
  expect(result[0]()).toBe(10)
  globalThis.dispatchEvent(new StorageEvent('storage', {key}))
  expect(result[0]()).toBe(25)
  globalThis.localStorage.clear()
  globalThis.dispatchEvent(new StorageEvent('storage', {key: null}))
  expect(result[0]()).toBe(10)
  dispose()
  globalThis.localStorage.setItem(key, '50')
  globalThis.dispatchEvent(new StorageEvent('storage', {key}))
  expect(result[0]()).toBe(10)
})

it('should retain and synchronize a value when persistence fails', () => {
  const {
    result: [first, second],
  } = renderHook(() => [usePreference(options), usePreference(options)] as const, {
    wrapper: PreferenceProvider,
  })
  const error = new Error('quota')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw error
  })
  const reportError = vi.fn()
  vi.stubGlobal('reportError', reportError)
  first[1](0)
  expect(first[0]()).toBe(0)
  expect(second[0]()).toBe(0)
  expect(reportError).toHaveBeenCalledWith(error)
})

it('should apply the default to null updates, other consumers, and restored null values', () => {
  const {
    result: [first, second],
  } = renderHook(() => [usePreference(options), usePreference(options)] as const, {
    wrapper: PreferenceProvider,
  })
  first[1](25)
  first[1](null)
  expect(first[0]()).toBe(10)
  expect(second[0]()).toBe(10)
  expect(globalThis.localStorage.getItem(key)).toBe('null')
  expect(renderHook(() => usePreference(options), {wrapper: PreferenceProvider}).result[0]()).toBe(
    10,
  )
})

it('should allow null as the default and return to it when the value is cleared', () => {
  const {result} = renderHook(
    () => usePreference<number | null>({...options, defaultValue: null}),
    {wrapper: PreferenceProvider},
  )
  expect(result[0]()).toBeNull()
  result[1](0)
  expect(result[0]()).toBe(0)
  result[1](null)
  expect(result[0]()).toBeNull()
})
