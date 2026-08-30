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
  vi.restoreAllMocks()
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

it('should replace a stale browser copy with the native preference', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  localStorage.setItem('pomo:weather-preference:v2', JSON.stringify(DEFAULT_WEATHER_PREFERENCE))
  storageMocks.getItem.mockResolvedValue(JSON.stringify(disabledPreference))

  await expect(readWeatherPreference()).resolves.toEqual(disabledPreference)
  expect(storageMocks.getItem).toHaveBeenCalledWith('pomo:weather-preference:v2')
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
  localStorage.setItem('pomo:weather-preference:v2', JSON.stringify(disabledPreference))
  storageMocks.getItem.mockResolvedValueOnce(null).mockResolvedValueOnce('{}')

  await expect(readWeatherPreference()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
  expect(localStorage.getItem('pomo:weather-preference:v2')).toBe(
    JSON.stringify(DEFAULT_WEATHER_PREFERENCE),
  )
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

it('should persist through native storage when browser storage fails', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  localStorage.setItem('pomo:weather-preference:v2', JSON.stringify(DEFAULT_WEATHER_PREFERENCE))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new DOMException('Browser storage unavailable', 'QuotaExceededError')
  })
  storageMocks.setItem.mockResolvedValue()
  storageMocks.getItem.mockResolvedValue(JSON.stringify(disabledPreference))

  await expect(writeWeatherPreference(disabledPreference)).resolves.toBeUndefined()
  expect(storageMocks.setItem).toHaveBeenCalledWith(
    'pomo:weather-preference:v2',
    JSON.stringify(disabledPreference),
  )
  await expect(readWeatherPreference()).resolves.toEqual(disabledPreference)
  expect(localStorage.getItem('pomo:weather-preference:v2')).toBe(
    JSON.stringify(disabledPreference),
  )
})

it('should reject a native save when native storage fails', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.setItem.mockRejectedValue(new Error('Native storage unavailable'))

  await expect(writeWeatherPreference(disabledPreference)).rejects.toThrow(
    'Failed to persist weather preference.',
  )
})

it('should reject a native save when both storage writes fail', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new DOMException('Browser storage unavailable', 'QuotaExceededError')
  })
  storageMocks.setItem.mockRejectedValue(new Error('Native storage unavailable'))

  await expect(writeWeatherPreference(disabledPreference)).rejects.toThrow(
    'Failed to persist weather preference.',
  )
})

it('should reject a browser save when browser storage fails', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new DOMException('Browser storage unavailable', 'QuotaExceededError')
  })

  await expect(writeWeatherPreference(disabledPreference)).rejects.toThrow(
    'Failed to persist weather preference.',
  )
})

it('should reject a native read failure instead of using the browser copy', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  localStorage.setItem('pomo:weather-preference:v2', JSON.stringify(disabledPreference))
  storageMocks.getItem.mockRejectedValue(new Error('native read unavailable'))

  await expect(readWeatherPreference()).rejects.toThrow('Failed to read weather preference.')
})

it('should not let a pending native read replace a newer browser preference', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  let completeRead: (value: string) => void = () => undefined
  storageMocks.getItem.mockReturnValueOnce(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  storageMocks.getItem.mockResolvedValue(JSON.stringify(disabledPreference))
  storageMocks.setItem.mockResolvedValue()

  const pendingRead = readWeatherPreference()
  await writeWeatherPreference(disabledPreference)
  completeRead(JSON.stringify(DEFAULT_WEATHER_PREFERENCE))

  await expect(pendingRead).resolves.toEqual(disabledPreference)
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

it('should wait for an active native write before reading the preference', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  let nativePreference = JSON.stringify(DEFAULT_WEATHER_PREFERENCE)
  let completeWrite: () => void = () => undefined
  storageMocks.getItem.mockImplementation(async () => nativePreference)
  storageMocks.setItem.mockImplementation(
    (_key, value) =>
      new Promise((resolve) => {
        completeWrite = () => {
          nativePreference = value
          resolve()
        }
      }),
  )

  const pendingWrite = writeWeatherPreference(disabledPreference)
  await vi.waitFor(() => expect(storageMocks.setItem).toHaveBeenCalledOnce())
  const pendingRead = readWeatherPreference()
  completeWrite()

  await expect(pendingWrite).resolves.toBeUndefined()
  await expect(pendingRead).resolves.toEqual(disabledPreference)
  expect(storageMocks.getItem).toHaveBeenCalledOnce()
})
