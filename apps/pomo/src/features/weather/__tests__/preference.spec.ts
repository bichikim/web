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

it('should not let a pending toss read replace a newer preference', async () => {
  storage.usesTossStorage.mockReturnValue(true)
  let completeRead: (value: unknown) => void = () => undefined
  storage.readToss.mockReturnValueOnce(
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

it('should preserve toss write order during rapid preference changes', async () => {
  storage.usesTossStorage.mockReturnValue(true)
  const tossWrites: unknown[] = []
  let completeFirstWrite: () => void = () => undefined
  storage.writeToss.mockImplementation(async (_key, value) => {
    tossWrites.push(value)

    if (tossWrites.length === 1) {
      await new Promise<void>((resolve) => {
        completeFirstWrite = resolve
      })
    }
  })

  const firstWrite = repository.write(disabledPreference)
  const secondWrite = repository.write(DEFAULT_WEATHER_PREFERENCE)
  await vi.waitFor(() => expect(tossWrites.length).toBeGreaterThan(0))

  expect(tossWrites).toEqual([disabledPreference])
  completeFirstWrite()
  await Promise.all([firstWrite, secondWrite])
  expect(tossWrites).toEqual([disabledPreference, DEFAULT_WEATHER_PREFERENCE])
})

it('should wait for an active toss write before reading the preference', async () => {
  storage.usesTossStorage.mockReturnValue(true)
  tossValues.set(STORAGE_KEY, DEFAULT_WEATHER_PREFERENCE)
  let completeWrite: () => void = () => undefined
  storage.writeToss.mockImplementation(
    (key, value) =>
      new Promise((resolve) => {
        completeWrite = () => {
          tossValues.set(key, value)
          resolve()
        }
      }),
  )

  const pendingWrite = repository.write(disabledPreference)
  await vi.waitFor(() => expect(storage.writeToss).toHaveBeenCalledOnce())
  const pendingRead = repository.read()
  completeWrite()

  await expect(pendingWrite).resolves.toBeUndefined()
  await expect(pendingRead).resolves.toEqual(disabledPreference)
  expect(storage.readToss).toHaveBeenCalledOnce()
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

it('should preserve a different city selected during name restoration', async () => {
  const pending = Promise.withResolvers<WeatherLocation>()
  const restoreLocation = vi.fn(() => pending.promise)
  webValues.set(STORAGE_KEY, storedPreference)
  const restoring = createWeatherPreferenceRepository({restoreLocation, storage})
  const reading = restoring.read()
  await vi.waitFor(() => expect(restoreLocation).toHaveBeenCalledOnce())
  await restoring.write(disabledPreference)
  pending.resolve(restoredLocation)
  expect(await reading).toEqual(disabledPreference)
  expect(webValues.get(STORAGE_KEY)).toEqual(disabledPreference)
})

it('should merge names without reverting settings changed during lookup', async () => {
  const pending = Promise.withResolvers<WeatherLocation>()
  const restoreLocation = vi.fn(() => pending.promise)
  webValues.set(STORAGE_KEY, storedPreference)
  const restoring = createWeatherPreferenceRepository({restoreLocation, storage})
  const reading = restoring.read()
  await vi.waitFor(() => expect(restoreLocation).toHaveBeenCalledOnce())
  await restoring.write({...storedPreference, enabled: false, sceneMode: 'rain'})
  pending.resolve(restoredLocation)
  expect(await reading).toEqual({
    ...storedPreference,
    enabled: false,
    location: restoredLocation,
    sceneMode: 'rain',
  })
})

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

it('should return a newer selection written while restored names are being persisted', async () => {
  storage.usesTossStorage.mockReturnValue(true)
  tossValues.set(STORAGE_KEY, storedPreference)
  const pending = Promise.withResolvers<void>()
  storage.writeToss.mockImplementationOnce(async (key, value) => {
    await pending.promise
    tossValues.set(key, value)
  })
  const restoring = createWeatherPreferenceRepository({
    restoreLocation: async () => restoredLocation,
    storage,
  })
  const reading = restoring.read()
  await vi.waitFor(() => expect(storage.writeToss).toHaveBeenCalledOnce())
  const selection = restoring.write(disabledPreference)
  pending.resolve()
  await selection
  expect(await reading).toEqual(disabledPreference)
  expect(tossValues.get(STORAGE_KEY)).toEqual(disabledPreference)
  expect(webValues.get(STORAGE_KEY)).toEqual(disabledPreference)
})

it('should not write stale names if the selection changes during the final storage read', async () => {
  webValues.set(STORAGE_KEY, storedPreference)
  let selection: Promise<void> | undefined
  const restoring = createWeatherPreferenceRepository({
    restoreLocation: async () => {
      storage.readWeb.mockImplementationOnce(() => {
        selection = restoring.write(disabledPreference)
        return storedPreference
      })
      return restoredLocation
    },
    storage,
  })
  expect(await restoring.read()).toEqual(disabledPreference)
  await selection
  expect(storage.writeWeb).toHaveBeenCalledOnce()
  expect(webValues.get(STORAGE_KEY)).toEqual(disabledPreference)
})
