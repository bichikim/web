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
    names: {en: 'Tokyo', ko: '도쿄'},
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
      names: {en: 'Tokyo', ko: '도쿄'},
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

it('should return a newly supported Korean city as its stable legacy location', async () => {
  apiMocks.searchOpenWeatherLocations.mockResolvedValue([
    {
      country: 'KR',
      latitude: 35.5038,
      longitude: 128.7464,
      name: 'Miryang',
      providerLocationId: '35.5038,128.7464',
      region: 'Gyeongsangnam-do',
    },
  ])
  const mocks = createDatabase()

  await expect(searchWorldWeatherLocations({query: 'Miryang'}, mocks.database)).resolves.toEqual([
    LEGACY_WEATHER_LOCATIONS.miryang,
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
it('should preserve all legacy coordinates and IDs without reading the database', async () => {
  const mocks = createDatabase()
  const expected = [
    ['seoul', 37.5665, 126.978],
    ['busan', 35.1796, 129.0756],
    ['daegu', 35.8714, 128.6014],
    ['incheon', 37.4563, 126.7052],
    ['gwangju', 35.1595, 126.8526],
    ['daejeon', 36.3504, 127.3845],
    ['ulsan', 35.5384, 129.3114],
    ['jeju', 33.4996, 126.5312],
    ['sejong', 36.48, 127.289],
    ['suwon', 37.2636, 127.0286],
    ['seongnam', 37.42, 127.1267],
    ['goyang', 37.6584, 126.832],
    ['yongin', 37.2411, 127.1776],
    ['chuncheon', 37.8813, 127.7298],
    ['wonju', 37.3422, 127.9202],
    ['gangneung', 37.7519, 128.8761],
    ['sokcho', 38.207, 128.5918],
    ['cheongju', 36.6424, 127.489],
    ['chungju', 36.991, 127.926],
    ['cheonan', 36.8151, 127.1139],
    ['asan', 36.7898, 127.0018],
    ['jeonju', 35.8242, 127.148],
    ['iksan', 35.9483, 126.9577],
    ['gunsan', 35.9677, 126.7366],
    ['mokpo', 34.8118, 126.3922],
    ['yeosu', 34.7604, 127.6622],
    ['suncheon', 34.9506, 127.4875],
    ['pohang', 36.019, 129.3435],
    ['gyeongju', 35.8562, 129.2247],
    ['gumi', 36.1195, 128.3446],
    ['andong', 36.5684, 128.7294],
    ['changwon', 35.2281, 128.6811],
    ['gimhae', 35.2285, 128.8894],
    ['jinju', 35.1799, 128.1076],
    ['geoje', 34.8806, 128.6211],
    ['miryang', 35.5038, 128.7464],
  ] as const
  await Promise.all(
    expected.map(async ([slug, latitude, longitude]) => {
      await expect(
        getWorldWeatherLocation(`openweather:legacy:${slug}`, mocks.database),
      ).resolves.toEqual({
        ...LEGACY_WEATHER_LOCATIONS[slug],
        latitude,
        longitude,
        providerLocationId: `legacy:${slug}`,
      })
    }),
  )
  expect(mocks.database.select).not.toHaveBeenCalled()
  expect(mocks.insert).not.toHaveBeenCalled()
})
