import {beforeEach, expect, it, vi} from 'vitest'

import {LEGACY_WEATHER_LOCATIONS} from '../locations'
import {
  createWeatherPreferenceRepository,
  DEFAULT_WEATHER_PREFERENCE,
  type WeatherPreferenceRepository,
  type WeatherPreferenceStorage,
} from '../preference'

const STORAGE_KEY = 'pomo:weather-preference:v2'
const LEGACY_STORAGE_KEY = 'pomo:weather-preference:v1'
const disabledPreference = {
  enabled: false,
  location: LEGACY_WEATHER_LOCATIONS.seoul,
  sceneMode: 'cloudy',
} as const

const createStorageHarness = () => {
  const nativeValues = new Map<string, unknown>()
  const webValues = new Map<string, unknown>()
  const storage = {
    isNative: vi.fn(() => false),
    readNative: vi.fn<(key: string) => Promise<unknown | null>>(async (key) => {
      return nativeValues.get(key) ?? null
    }),
    readWeb: vi.fn<(key: string) => unknown | null>((key) => webValues.get(key) ?? null),
    writeNative: vi.fn(async (key: string, value: unknown) => {
      nativeValues.set(key, value)
    }),
    writeWeb: vi.fn((key: string, value: unknown) => {
      webValues.set(key, value)
    }),
  } satisfies WeatherPreferenceStorage

  return {
    nativeValues,
    repository: createWeatherPreferenceRepository({storage}),
    storage,
    webValues,
  }
}

let nativeValues: Map<string, unknown>
let repository: WeatherPreferenceRepository
let storage: ReturnType<typeof createStorageHarness>['storage']
let webValues: Map<string, unknown>

beforeEach(() => {
  ;({nativeValues, repository, storage, webValues} = createStorageHarness())
})

it('should use the default when browser storage is missing or invalid', async () => {
  await expect(repository.read()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)

  webValues.set(LEGACY_STORAGE_KEY, '{invalid')
  await expect(repository.read()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
})

it.each([
  null,
  {},
  {citySlug: 'seoul'},
  {citySlug: 'seoul', enabled: 'yes'},
  {citySlug: 'unknown', enabled: true},
  {citySlug: 'seoul', enabled: true, sceneMode: 'unknown'},
])('should reject an invalid browser preference shape', async (value) => {
  webValues.set(LEGACY_STORAGE_KEY, value)

  await expect(repository.read()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
})

it.each([
  null,
  {},
  {enabled: true},
  {enabled: 'yes', location: LEGACY_WEATHER_LOCATIONS.seoul},
  {enabled: true, location: LEGACY_WEATHER_LOCATIONS.seoul, sceneMode: 'unknown'},
  {enabled: true, location: {id: 'invalid'}},
])('should reject an invalid current browser preference shape', async (value) => {
  webValues.set(STORAGE_KEY, value)

  await expect(repository.read()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
})

it('should migrate a stored preference without a scene mode to automatic', async () => {
  webValues.set(LEGACY_STORAGE_KEY, {citySlug: 'seoul', enabled: true})

  await expect(repository.read()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
  expect(webValues.get(STORAGE_KEY)).toEqual(DEFAULT_WEATHER_PREFERENCE)
})

it('should persist and restore a browser preference', async () => {
  await repository.write(disabledPreference)

  await expect(repository.read()).resolves.toEqual(disabledPreference)
  expect(webValues.get(STORAGE_KEY)).toEqual(disabledPreference)
  expect(storage.writeNative).not.toHaveBeenCalled()
})

it('should restore a native preference and rebuild the browser copy', async () => {
  storage.isNative.mockReturnValue(true)
  nativeValues.set(STORAGE_KEY, disabledPreference)

  await expect(repository.read()).resolves.toEqual(disabledPreference)
  expect(webValues.get(STORAGE_KEY)).toEqual(disabledPreference)
})

it('should replace a stale browser copy with the native preference', async () => {
  storage.isNative.mockReturnValue(true)
  webValues.set(STORAGE_KEY, DEFAULT_WEATHER_PREFERENCE)
  nativeValues.set(STORAGE_KEY, disabledPreference)

  await expect(repository.read()).resolves.toEqual(disabledPreference)
  expect(storage.readNative).toHaveBeenCalledWith(STORAGE_KEY)
  expect(webValues.get(STORAGE_KEY)).toEqual(disabledPreference)
})

it('should migrate a native legacy city preference', async () => {
  storage.isNative.mockReturnValue(true)
  nativeValues.set(LEGACY_STORAGE_KEY, {
    citySlug: 'jeju',
    enabled: false,
    sceneMode: 'snow',
  })

  await expect(repository.read()).resolves.toEqual({
    enabled: false,
    location: LEGACY_WEATHER_LOCATIONS.jeju,
    sceneMode: 'snow',
  })
})

it('should use defaults when native storage is empty or invalid', async () => {
  storage.isNative.mockReturnValue(true)
  webValues.set(STORAGE_KEY, disabledPreference)
  nativeValues.set(LEGACY_STORAGE_KEY, {})

  await expect(repository.read()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
  expect(webValues.get(STORAGE_KEY)).toEqual(DEFAULT_WEATHER_PREFERENCE)
  await expect(repository.read()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
})

it('should mirror a preference to native storage', async () => {
  storage.isNative.mockReturnValue(true)

  await repository.write(disabledPreference)

  expect(storage.writeNative).toHaveBeenCalledWith(STORAGE_KEY, disabledPreference)
  expect(nativeValues.get(STORAGE_KEY)).toEqual(disabledPreference)
})

it('should persist through native storage when browser storage fails', async () => {
  storage.isNative.mockReturnValue(true)
  webValues.set(STORAGE_KEY, DEFAULT_WEATHER_PREFERENCE)
  storage.writeWeb.mockImplementationOnce(() => {
    throw new Error('Browser storage unavailable')
  })

  await expect(repository.write(disabledPreference)).resolves.toBeUndefined()
  expect(nativeValues.get(STORAGE_KEY)).toEqual(disabledPreference)
  await expect(repository.read()).resolves.toEqual(disabledPreference)
  expect(webValues.get(STORAGE_KEY)).toEqual(disabledPreference)
})

it('should reject a native save when native storage fails', async () => {
  storage.isNative.mockReturnValue(true)
  storage.writeNative.mockRejectedValue(new Error('Native storage unavailable'))

  await expect(repository.write(disabledPreference)).rejects.toThrow(
    'Failed to persist weather preference.',
  )
})

it('should reject a native save when both storage writes fail', async () => {
  storage.isNative.mockReturnValue(true)
  storage.writeWeb.mockImplementation(() => {
    throw new Error('Browser storage unavailable')
  })
  storage.writeNative.mockRejectedValue(new Error('Native storage unavailable'))

  await expect(repository.write(disabledPreference)).rejects.toThrow(
    'Failed to persist weather preference.',
  )
})

it('should reject a browser save when browser storage fails', async () => {
  storage.writeWeb.mockImplementation(() => {
    throw new Error('Browser storage unavailable')
  })

  await expect(repository.write(disabledPreference)).rejects.toThrow(
    'Failed to persist weather preference.',
  )
})

it('should reject a native read failure instead of using the browser copy', async () => {
  storage.isNative.mockReturnValue(true)
  webValues.set(STORAGE_KEY, disabledPreference)
  storage.readNative.mockRejectedValue(new Error('Native storage unavailable'))

  await expect(repository.read()).rejects.toThrow('Failed to read weather preference.')
})

it('should not let a pending native read replace a newer preference', async () => {
  storage.isNative.mockReturnValue(true)
  let completeRead: (value: unknown) => void = () => undefined
  storage.readNative.mockReturnValueOnce(
    new Promise<unknown>((resolve) => {
      completeRead = resolve
    }),
  )

  const pendingRead = repository.read()
  await repository.write(disabledPreference)
  completeRead(DEFAULT_WEATHER_PREFERENCE)

  await expect(pendingRead).resolves.toEqual(disabledPreference)
  expect(webValues.get(STORAGE_KEY)).toEqual(disabledPreference)
})

it('should preserve native write order during rapid preference changes', async () => {
  storage.isNative.mockReturnValue(true)
  const nativeWrites: unknown[] = []
  let completeFirstWrite: () => void = () => undefined
  storage.writeNative.mockImplementation(async (_key, value) => {
    nativeWrites.push(value)

    if (nativeWrites.length === 1) {
      await new Promise<void>((resolve) => {
        completeFirstWrite = resolve
      })
    }
  })

  const firstWrite = repository.write(disabledPreference)
  const secondWrite = repository.write(DEFAULT_WEATHER_PREFERENCE)
  await vi.waitFor(() => expect(nativeWrites.length).toBeGreaterThan(0))

  expect(nativeWrites).toEqual([disabledPreference])
  completeFirstWrite()
  await Promise.all([firstWrite, secondWrite])
  expect(nativeWrites).toEqual([disabledPreference, DEFAULT_WEATHER_PREFERENCE])
})

it('should wait for an active native write before reading the preference', async () => {
  storage.isNative.mockReturnValue(true)
  nativeValues.set(STORAGE_KEY, DEFAULT_WEATHER_PREFERENCE)
  let completeWrite: () => void = () => undefined
  storage.writeNative.mockImplementation(
    (key, value) =>
      new Promise((resolve) => {
        completeWrite = () => {
          nativeValues.set(key, value)
          resolve()
        }
      }),
  )

  const pendingWrite = repository.write(disabledPreference)
  await vi.waitFor(() => expect(storage.writeNative).toHaveBeenCalledOnce())
  const pendingRead = repository.read()
  completeWrite()

  await expect(pendingWrite).resolves.toBeUndefined()
  await expect(pendingRead).resolves.toEqual(disabledPreference)
  expect(storage.readNative).toHaveBeenCalledOnce()
})
