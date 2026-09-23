/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {LEGACY_WEATHER_LOCATIONS} from '../locations'
import {
  createWeatherPreferenceRepository,
  DEFAULT_WEATHER_PREFERENCE,
  type WeatherPreferenceRepository,
  type WeatherPreferenceStorage,
} from '../preference'
import type {WeatherLocation} from '../contract'

const STORAGE_KEY = 'pomo:weather-preference:v2'
const LEGACY_STORAGE_KEY = 'pomo:weather-preference:v1'
const disabledPreference = {
  enabled: false,
  location: LEGACY_WEATHER_LOCATIONS.seoul,
  sceneMode: 'cloudy',
} as const

const createStorageHarness = () => {
  const tossValues = new Map<string, unknown>()
  const webValues = new Map<string, unknown>()
  const storage = {
    readToss: vi.fn<(key: string) => Promise<unknown | null>>(async (key) => {
      return tossValues.get(key) ?? null
    }),
    readWeb: vi.fn<(key: string) => unknown | null>((key) => webValues.get(key) ?? null),
    usesTossStorage: vi.fn(() => false),
    writeToss: vi.fn(async (key: string, value: unknown) => {
      tossValues.set(key, value)
    }),
    writeWeb: vi.fn((key: string, value: unknown) => {
      webValues.set(key, value)
    }),
  } satisfies WeatherPreferenceStorage

  return {
    repository: createWeatherPreferenceRepository({storage}),
    storage,
    tossValues,
    webValues,
  }
}

let tossValues: Map<string, unknown>
let repository: WeatherPreferenceRepository
let storage: ReturnType<typeof createStorageHarness>['storage']
let webValues: Map<string, unknown>

beforeEach(() => {
  ;({tossValues, repository, storage, webValues} = createStorageHarness())
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
  expect(storage.writeToss).not.toHaveBeenCalled()
})

it('should restore a toss preference and rebuild the browser copy', async () => {
  storage.usesTossStorage.mockReturnValue(true)
  tossValues.set(STORAGE_KEY, disabledPreference)

  await expect(repository.read()).resolves.toEqual(disabledPreference)
  expect(webValues.get(STORAGE_KEY)).toEqual(disabledPreference)
})

it('should replace a stale browser copy with the toss preference', async () => {
  storage.usesTossStorage.mockReturnValue(true)
  webValues.set(STORAGE_KEY, DEFAULT_WEATHER_PREFERENCE)
  tossValues.set(STORAGE_KEY, disabledPreference)

  await expect(repository.read()).resolves.toEqual(disabledPreference)
  expect(storage.readToss).toHaveBeenCalledWith(STORAGE_KEY)
  expect(webValues.get(STORAGE_KEY)).toEqual(disabledPreference)
})

it('should migrate a toss legacy city preference', async () => {
  storage.usesTossStorage.mockReturnValue(true)
  tossValues.set(LEGACY_STORAGE_KEY, {
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

it('should use defaults when toss storage is empty or invalid', async () => {
  storage.usesTossStorage.mockReturnValue(true)
  webValues.set(STORAGE_KEY, disabledPreference)
  tossValues.set(LEGACY_STORAGE_KEY, {})

  await expect(repository.read()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
  expect(webValues.get(STORAGE_KEY)).toEqual(DEFAULT_WEATHER_PREFERENCE)
  await expect(repository.read()).resolves.toEqual(DEFAULT_WEATHER_PREFERENCE)
})

it('should mirror a preference to toss storage', async () => {
  storage.usesTossStorage.mockReturnValue(true)

  await repository.write(disabledPreference)

  expect(storage.writeToss).toHaveBeenCalledWith(STORAGE_KEY, disabledPreference)
  expect(tossValues.get(STORAGE_KEY)).toEqual(disabledPreference)
})

it('should persist through toss storage when browser storage fails', async () => {
  storage.usesTossStorage.mockReturnValue(true)
  webValues.set(STORAGE_KEY, DEFAULT_WEATHER_PREFERENCE)
  storage.writeWeb.mockImplementationOnce(() => {
    throw new Error('Browser storage unavailable')
  })

  await expect(repository.write(disabledPreference)).resolves.toBeUndefined()
  expect(tossValues.get(STORAGE_KEY)).toEqual(disabledPreference)
  await expect(repository.read()).resolves.toEqual(disabledPreference)
  expect(webValues.get(STORAGE_KEY)).toEqual(disabledPreference)
})

it('should reject a toss save when toss storage fails', async () => {
  storage.usesTossStorage.mockReturnValue(true)
  storage.writeToss.mockRejectedValue(new Error('Toss storage unavailable'))

  await expect(repository.write(disabledPreference)).rejects.toThrow(
    'Failed to persist weather preference.',
  )
})

it('should reject a toss save when both storage writes fail', async () => {
  storage.usesTossStorage.mockReturnValue(true)
  storage.writeWeb.mockImplementation(() => {
    throw new Error('Browser storage unavailable')
  })
  storage.writeToss.mockRejectedValue(new Error('Toss storage unavailable'))

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

it('should reject a toss read failure instead of using the browser copy', async () => {
  storage.usesTossStorage.mockReturnValue(true)
  webValues.set(STORAGE_KEY, disabledPreference)
  storage.readToss.mockRejectedValue(new Error('Toss storage unavailable'))

  await expect(repository.read()).rejects.toThrow('Failed to read weather preference.')
})

const storedLocation = {
  country: 'US',
  id: 'openweather:40.7128,-74.0060',
  name: 'New York',
  region: 'New York',
} as const satisfies WeatherLocation
const storedPreference = {...DEFAULT_WEATHER_PREFERENCE, location: storedLocation}
const restoredLocation = {...storedLocation, names: {en: 'New York', ko: '뉴욕'}}

it.each([false, true])(
  'should persist restored names through the repository with toss=%s',
  async (toss) => {
    storage.usesTossStorage.mockReturnValue(toss)
    webValues.set(STORAGE_KEY, storedPreference)
    tossValues.set(STORAGE_KEY, storedPreference)
    const restoreLocation = vi.fn().mockResolvedValue(restoredLocation)
    const restoring = createWeatherPreferenceRepository({restoreLocation, storage})
    expect(await restoring.read()).toEqual({...storedPreference, location: restoredLocation})
    expect(restoreLocation).toHaveBeenCalledWith(storedLocation)
    expect(webValues.get(STORAGE_KEY)).toEqual({...storedPreference, location: restoredLocation})
    if (toss) {
      expect(tossValues.get(STORAGE_KEY)).toEqual(webValues.get(STORAGE_KEY))
    }
  },
)

it('should keep stored data when name lookup fails', async () => {
  webValues.set(STORAGE_KEY, storedPreference)
  const restoring = createWeatherPreferenceRepository({
    restoreLocation: async () => {
      throw new Error('lookup failed')
    },
    storage,
  })
  expect(await restoring.read()).toEqual(storedPreference)
  expect(storage.writeWeb).not.toHaveBeenCalled()
})

it('should avoid writing when lookup does not enrich the stored city', async () => {
  webValues.set(STORAGE_KEY, storedPreference)
  const restoring = createWeatherPreferenceRepository({
    restoreLocation: async (location) => location,
    storage,
  })
  expect(await restoring.read()).toEqual(storedPreference)
  expect(storage.writeWeb).not.toHaveBeenCalled()
})
