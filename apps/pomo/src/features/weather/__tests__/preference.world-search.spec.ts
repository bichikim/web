/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'

const quotaMocks = vi.hoisted(() => ({reserveOpenWeatherRequest: vi.fn()}))

vi.mock('src/env', () => ({
  env: {OPENWEATHER_API_KEY: 'secret-key'},
}))
vi.mock('src/server/weather/provider-quota', () => ({
  reserveOpenWeatherRequest: quotaMocks.reserveOpenWeatherRequest,
}))

import {restoreWeatherLocationNames} from '../location-names'
import {
  createWeatherPreferenceRepository,
  DEFAULT_WEATHER_PREFERENCE,
  type WeatherPreference,
  WEATHER_PREFERENCE_STORAGE_KEY,
  type WeatherPreferenceStorage,
} from '../preference'
import type {Database} from 'src/server/database'
import {searchWorldWeatherLocations} from 'src/server/weather/world-locations'

const savedLocation = {
  country: 'GB',
  id: 'openweather:51.5200,-0.1100' as const,
  name: 'Location A',
  region: 'England',
}

it('should restore a legacy rounded preference through exact world search', async () => {
  const savedPreference = {
    ...DEFAULT_WEATHER_PREFERENCE,
    location: savedLocation,
  } satisfies WeatherPreference
  const registeredLocation = {
    country: 'GB',
    id: savedLocation.id,
    latitude: 51.52001,
    longitude: -0.11001,
    name: 'Location A',
    providerLocationId: '51.5200,-0.1100',
    region: 'England',
  }
  const limit = vi.fn().mockResolvedValue([registeredLocation])
  const where = vi.fn(() => ({limit}))
  const from = vi.fn(() => ({where}))
  const select = vi.fn(() => ({from}))
  const conflictUpdate = vi.fn().mockResolvedValue(undefined)
  const values = vi.fn(() => ({onConflictDoUpdate: conflictUpdate}))
  const insert = vi.fn(() => ({values}))
  const database = {insert, select} as unknown as Database
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json([
      {
        country: 'GB',
        lat: 51.52001,
        local_names: {en: 'Location A', ko: '위치 A'},
        lon: -0.11001,
        name: 'Location A',
        state: 'England',
      },
    ]),
  )
  const valuesByKey = new Map<string, unknown>([[WEATHER_PREFERENCE_STORAGE_KEY, savedPreference]])
  const storage = {
    readToss: vi.fn(async () => null),
    readWeb: vi.fn((key: string) => valuesByKey.get(key) ?? null),
    usesTossStorage: vi.fn(() => false),
    writeToss: vi.fn(async () => undefined),
    writeWeb: vi.fn((key: string, value: unknown) => valuesByKey.set(key, value)),
  } satisfies WeatherPreferenceStorage
  const search = ({query}: {readonly query: string}) =>
    searchWorldWeatherLocations({fetcher, query}, database)
  const repository = createWeatherPreferenceRepository({
    restoreLocation: (location) => restoreWeatherLocationNames({location, search}),
    storage,
  })
  const restoredPreference = {
    ...savedPreference,
    location: {...savedLocation, names: {en: 'Location A', ko: '위치 A'}},
  }

  await expect(repository.read()).resolves.toEqual(restoredPreference)
  expect(valuesByKey.get(WEATHER_PREFERENCE_STORAGE_KEY)).toEqual(restoredPreference)
  expect(fetcher).toHaveBeenCalledOnce()
})
