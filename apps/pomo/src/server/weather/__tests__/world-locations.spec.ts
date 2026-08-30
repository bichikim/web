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
