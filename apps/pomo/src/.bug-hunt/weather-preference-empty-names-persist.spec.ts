/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import type {WeatherLocation} from '../features/weather/contract'
import {
  createWeatherPreferenceRepository,
  DEFAULT_WEATHER_PREFERENCE,
  WEATHER_PREFERENCE_STORAGE_KEY,
} from '../features/weather/preference'

const storedLocation = {
  country: 'US',
  id: 'openweather:40.7128,-74.0060',
  name: 'New York',
  region: 'New York',
} as const satisfies WeatherLocation

it('should not persist weather preference when name restore only adds an empty names object', async () => {
  const storedPreference = {...DEFAULT_WEATHER_PREFERENCE, location: storedLocation}
  const webValues = new Map<string, unknown>([[WEATHER_PREFERENCE_STORAGE_KEY, storedPreference]])
  const storage = {
    readToss: vi.fn(async () => null),
    readWeb: vi.fn((key: string) => webValues.get(key) ?? null),
    usesTossStorage: () => false,
    writeToss: vi.fn(async () => undefined),
    writeWeb: vi.fn(async (key: string, value: unknown) => {
      webValues.set(key, value)
    }),
  }
  const repository = createWeatherPreferenceRepository({
    restoreLocation: async (location) => ({...location, names: {}}),
    storage,
  })

  await expect(repository.read()).resolves.toEqual(storedPreference)
  expect(storage.writeWeb).not.toHaveBeenCalled()
})
