import {beforeEach, expect, it, vi} from 'vitest'

const apiMocks = vi.hoisted(() => ({searchOpenWeatherLocations: vi.fn()}))
const quotaMocks = vi.hoisted(() => ({reserveOpenWeatherRequest: vi.fn()}))

vi.mock('src/env', () => ({
  env: {},
}))
vi.mock('../openweather-client', () => ({
  searchOpenWeatherLocations: apiMocks.searchOpenWeatherLocations,
}))
vi.mock('../provider-quota', () => ({
  reserveOpenWeatherRequest: quotaMocks.reserveOpenWeatherRequest,
}))

import {
  getPublicWeatherLocation,
  getWorldWeatherLocation,
  searchWorldWeatherLocations,
} from '../world-locations'
import {LEGACY_WEATHER_LOCATIONS} from 'src/features/weather'
import type {Database} from '../../database'

const createDatabase = (selected: ReadonlyArray<Record<string, unknown>> = []) => {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined)
  const values = vi.fn(() => ({onConflictDoUpdate}))
  const insert = vi.fn(() => ({values}))
  const limit = vi.fn().mockResolvedValue(selected)
  const where = vi.fn(() => ({limit}))
  const from = vi.fn(() => ({where}))
  const select = vi.fn(() => ({from}))
  return {database: {insert, select} as unknown as Database, insert, values}
}

beforeEach(() => {
  vi.clearAllMocks()
  quotaMocks.reserveOpenWeatherRequest.mockResolvedValue(undefined)
})

it('should reserve, register, and return fixed coordinates from provider search', async () => {
  const providerLocation = {
    country: 'Japan',
    latitude: 35.69,
    longitude: 139.69,
    name: 'Tokyo',
    providerLocationId: '35.6900,139.6900',
    region: 'Tokyo',
  }
  apiMocks.searchOpenWeatherLocations.mockResolvedValue([providerLocation])
  const mocks = createDatabase()

  await expect(searchWorldWeatherLocations({query: 'Tokyo'}, mocks.database)).resolves.toEqual([
    {
      country: 'Japan',
      id: 'openweather:35.6900,139.6900',
      name: 'Tokyo',
      region: 'Tokyo',
    },
  ])
  expect(quotaMocks.reserveOpenWeatherRequest).toHaveBeenCalledWith('search')
  expect(quotaMocks.reserveOpenWeatherRequest.mock.invocationCallOrder[0]).toBeLessThan(
    apiMocks.searchOpenWeatherLocations.mock.invocationCallOrder[0],
  )
  expect(mocks.values).toHaveBeenCalledWith([
    expect.objectContaining({
      id: 'openweather:35.6900,139.6900',
      latitude: 35.69,
      longitude: 139.69,
    }),
  ])
})

it('should avoid a database write for an empty provider search', async () => {
  apiMocks.searchOpenWeatherLocations.mockResolvedValue([])
  const mocks = createDatabase()

  await expect(searchWorldWeatherLocations({query: 'none'}, mocks.database)).resolves.toEqual([])
  expect(mocks.insert).not.toHaveBeenCalled()
})

it('should return a known provider coordinate as its stable legacy location', async () => {
  apiMocks.searchOpenWeatherLocations.mockResolvedValue([
    {
      country: 'KR',
      latitude: 37.5683,
      longitude: 126.9778,
      name: 'Seoul',
      providerLocationId: '37.5683,126.9778',
      region: 'Seoul',
    },
  ])
  const mocks = createDatabase()

  await expect(searchWorldWeatherLocations({query: 'Seoul'}, mocks.database)).resolves.toEqual([
    LEGACY_WEATHER_LOCATIONS.seoul,
  ])
  expect(mocks.insert).not.toHaveBeenCalled()
})

it('should register a foreign provider location that shares a legacy city name', async () => {
  const providerLocation = {
    country: 'YE',
    latitude: 14.34,
    longitude: 44.18,
    name: 'Busan',
    providerLocationId: '14.3400,44.1800',
    region: 'Dhamar Governorate',
  }
  apiMocks.searchOpenWeatherLocations.mockResolvedValue([providerLocation])
  const mocks = createDatabase()

  await expect(searchWorldWeatherLocations({query: 'Busan'}, mocks.database)).resolves.toEqual([
    {
      country: 'YE',
      id: 'openweather:14.3400,44.1800',
      name: 'Busan',
      region: 'Dhamar Governorate',
    },
  ])
  expect(mocks.values).toHaveBeenCalledWith([
    expect.objectContaining({providerLocationId: providerLocation.providerLocationId}),
  ])
})

it('should register a nearby Korean district whose name is not a legacy city alias', async () => {
  const providerLocation = {
    country: 'KR',
    latitude: 35.1629,
    longitude: 129.0532,
    name: 'Busanjin-gu',
    providerLocationId: '35.1629,129.0532',
    region: 'Busan',
  }
  apiMocks.searchOpenWeatherLocations.mockResolvedValue([providerLocation])
  const mocks = createDatabase()

  await expect(
    searchWorldWeatherLocations({query: 'Busanjin-gu'}, mocks.database),
  ).resolves.toEqual([
    {
      country: 'KR',
      id: 'openweather:35.1629,129.0532',
      name: 'Busanjin-gu',
      region: 'Busan',
    },
  ])
  expect(mocks.values).toHaveBeenCalledWith([
    expect.objectContaining({providerLocationId: providerLocation.providerLocationId}),
  ])
})

it('should resolve legacy and registered provider locations', async () => {
  const mocks = createDatabase([
    {
      country: 'Japan',
      id: 'openweather:35.6900,139.6900',
      latitude: 35.69,
      longitude: 139.69,
      name: 'Tokyo',
      providerLocationId: '35.6900,139.6900',
      region: 'Tokyo',
    },
  ])

  await expect(
    getWorldWeatherLocation('openweather:legacy:seoul', mocks.database),
  ).resolves.toMatchObject({latitude: 37.5665, legacyCitySlug: 'seoul', longitude: 126.978})
  await expect(
    getWorldWeatherLocation('openweather:35.6900,139.6900', mocks.database),
  ).resolves.toMatchObject({
    id: 'openweather:35.6900,139.6900',
    providerLocationId: '35.6900,139.6900',
  })
})

it('should report a missing registered location and hide server-only coordinates', async () => {
  const mocks = createDatabase()

  await expect(
    getWorldWeatherLocation('openweather:0.0000,0.0000', mocks.database),
  ).resolves.toBeUndefined()
  expect(
    getPublicWeatherLocation({
      country: 'Japan',
      id: 'openweather:35.6900,139.6900',
      latitude: 35.69,
      longitude: 139.69,
      name: 'Tokyo',
      providerLocationId: '35.6900,139.6900',
      region: 'Tokyo',
    }),
  ).toEqual({
    country: 'Japan',
    id: 'openweather:35.6900,139.6900',
    name: 'Tokyo',
    region: 'Tokyo',
  })
  expect(
    getPublicWeatherLocation({
      country: '대한민국',
      id: 'openweather:legacy:seoul',
      latitude: 37.5665,
      legacyCitySlug: 'seoul',
      longitude: 126.978,
      name: '서울',
      providerLocationId: 'legacy:seoul',
      region: '서울특별시',
    }),
  ).toMatchObject({legacyCitySlug: 'seoul'})
})
