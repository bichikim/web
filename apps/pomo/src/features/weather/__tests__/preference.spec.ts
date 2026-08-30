/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  DEFAULT_WEATHER_PREFERENCE,
  readWeatherPreference,
  writeWeatherPreference,
} from '../preference'
import {LEGACY_WEATHER_LOCATIONS} from '../locations'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

const disabledPreference = {
  enabled: false,
  location: LEGACY_WEATHER_LOCATIONS.seoul,
  sceneMode: 'cloudy',
} as const

beforeEach(() => {
  localStorage.clear()
  storageMocks.getItem.mockReset()
  storageMocks.setItem.mockReset()
})

afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
})

it('should use the default when browser storage is missing or invalid', async () => {
  await expect(readWeatherPreference()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)

  localStorage.setItem('pomo:weather-preference:v1', '{invalid')
  await expect(readWeatherPreference()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
})

it.each([
  null,
  {},
  {citySlug: 'seoul'},
  {citySlug: 'seoul', enabled: 'yes'},
  {citySlug: 'unknown', enabled: true},
  {citySlug: 'seoul', enabled: true, sceneMode: 'unknown'},
])('should reject an invalid browser preference shape', async (value) => {
  localStorage.setItem('pomo:weather-preference:v1', JSON.stringify(value))

  await expect(readWeatherPreference()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
})

it.each([
  null,
  {},
  {enabled: true},
  {enabled: 'yes', location: LEGACY_WEATHER_LOCATIONS.seoul},
  {enabled: true, location: LEGACY_WEATHER_LOCATIONS.seoul, sceneMode: 'unknown'},
  {enabled: true, location: {id: 'invalid'}},
])('should reject an invalid current browser preference shape', async (value) => {
  localStorage.setItem('pomo:weather-preference:v2', JSON.stringify(value))

  await expect(readWeatherPreference()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
})

it('should migrate a stored preference without a scene mode to automatic', async () => {
  localStorage.setItem(
    'pomo:weather-preference:v1',
    JSON.stringify({citySlug: 'seoul', enabled: true}),
  )

  await expect(readWeatherPreference()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
})

it('should persist and restore a browser preference', async () => {
  await writeWeatherPreference(disabledPreference)

  await expect(readWeatherPreference()).resolves.toEqual(disabledPreference)
  expect(storageMocks.setItem).not.toHaveBeenCalled()
})

it('should restore a native preference and rebuild the browser copy', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockResolvedValue(JSON.stringify(disabledPreference))

  await expect(readWeatherPreference()).resolves.toEqual(disabledPreference)
  expect(localStorage.getItem('pomo:weather-preference:v2')).toBe(
    JSON.stringify(disabledPreference),
  )
})

it('should migrate a native legacy city preference', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(JSON.stringify({citySlug: 'jeju', enabled: false, sceneMode: 'snow'}))

  await expect(readWeatherPreference()).resolves.toEqual({
    enabled: false,
    location: LEGACY_WEATHER_LOCATIONS.jeju,
    sceneMode: 'snow',
  })
})

it('should use defaults when native storage is empty or invalid', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockResolvedValueOnce(null).mockResolvedValueOnce('{}')

  await expect(readWeatherPreference()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
  await expect(readWeatherPreference()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
})

it('should mirror a preference to native storage', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.setItem.mockResolvedValue()

  await writeWeatherPreference(disabledPreference)

  expect(storageMocks.setItem).toHaveBeenCalledWith(
    'pomo:weather-preference:v2',
    JSON.stringify(disabledPreference),
  )
})

it('should retain the browser preference when native storage fails', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockRejectedValue(new Error('native read unavailable'))
  storageMocks.setItem.mockRejectedValue(new Error('native write unavailable'))

  await expect(writeWeatherPreference(disabledPreference)).resolves.toBeUndefined()
  await expect(readWeatherPreference()).resolves.toEqual(disabledPreference)

  localStorage.clear()
  await expect(readWeatherPreference()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
})

it('should not let a pending native read replace a newer browser preference', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  let completeRead: (value: string) => void = () => undefined
  storageMocks.getItem.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  storageMocks.setItem.mockResolvedValue()

  const pendingRead = readWeatherPreference()
  await writeWeatherPreference(disabledPreference)
  completeRead(JSON.stringify(DEFAULT_WEATHER_PREFERENCE))

  await expect(pendingRead).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
  expect(JSON.parse(localStorage.getItem('pomo:weather-preference:v2') ?? '')).toEqual(
    disabledPreference,
  )
})

it('should preserve native write order during rapid preference changes', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  const nativeWrites: string[] = []
  let completeFirstWrite: () => void = () => undefined
  storageMocks.setItem.mockImplementation(async (_key, value) => {
    nativeWrites.push(value)

    if (nativeWrites.length === 1) {
      await new Promise<void>((resolve) => {
        completeFirstWrite = resolve
      })
    }
  })

  const firstWrite = writeWeatherPreference(disabledPreference)
  const secondWrite = writeWeatherPreference(DEFAULT_WEATHER_PREFERENCE)
  await vi.waitFor(() => expect(nativeWrites.length).toBeGreaterThan(0))

  expect(nativeWrites).toEqual([JSON.stringify(disabledPreference)])
  completeFirstWrite()
  await Promise.all([firstWrite, secondWrite])
  expect(nativeWrites).toEqual([
    JSON.stringify(disabledPreference),
    JSON.stringify(DEFAULT_WEATHER_PREFERENCE),
  ])
})
