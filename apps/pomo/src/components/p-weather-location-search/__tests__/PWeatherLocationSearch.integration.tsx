/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const databaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  getDatabase: vi.fn(),
  insert: vi.fn(),
  limit: vi.fn(),
  onConflictDoUpdate: vi.fn(),
  reserveQuota: vi.fn(),
  select: vi.fn(),
  values: vi.fn(),
  where: vi.fn(),
}))
vi.mock('src/env', () => ({env: {OPENWEATHER_API_KEY: 'weather-search-test-key'}}))
vi.mock('src/server/database', async (importOriginal) => {
  const database = await importOriginal<typeof import('src/server/database')>()
  return {...database, getDatabase: databaseMocks.getDatabase}
})
vi.mock('src/server/weather/provider-quota', () => ({
  reserveOpenWeatherRequest: databaseMocks.reserveQuota,
}))

import type {APIEvent} from '@solidjs/start/server'
import {PWeatherLocationSearch} from '../PWeatherLocationSearch'
import {GET as getWeatherLocations} from '../../../routes/api/weather/locations'

const providerLocations = [
  {
    country: 'GB',
    lat: 51.52001,
    local_names: {en: 'Location A', ko: '위치 A'},
    lon: -0.11001,
    name: 'Location A',
    state: 'England',
  },
  {
    country: 'GB',
    lat: 51.52004,
    local_names: {en: 'Location B', ko: '위치 B'},
    lon: -0.11004,
    name: 'Location B',
    state: 'England',
  },
]

const createFetch = () =>
  vi.fn<typeof fetch>(async (input, init) => {
    const inputUrl = input instanceof Request ? input.url : String(input)
    const url = new URL(inputUrl, 'https://www.pomofi.io')

    if (url.pathname === '/api/weather/locations') {
      const request = new Request(url, {
        headers: init?.headers,
        method: init?.method,
        signal: init?.signal,
      })
      return getWeatherLocations({request} as APIEvent)
    }

    if (url.origin === 'https://api.openweathermap.org' && url.pathname === '/geo/1.0/direct') {
      return Response.json(providerLocations)
    }

    throw new Error(`Unexpected weather-search request: ${url}`)
  })

beforeEach(() => {
  vi.clearAllMocks()
  databaseMocks.getDatabase.mockReturnValue({
    insert: databaseMocks.insert,
    select: databaseMocks.select,
  })
  databaseMocks.select.mockReturnValue({from: databaseMocks.from})
  databaseMocks.from.mockReturnValue({where: databaseMocks.where})
  databaseMocks.where.mockReturnValue({limit: databaseMocks.limit})
  databaseMocks.limit.mockResolvedValue([])
  databaseMocks.insert.mockReturnValue({values: databaseMocks.values})
  databaseMocks.values.mockReturnValue({onConflictDoUpdate: databaseMocks.onConflictDoUpdate})
  databaseMocks.onConflictDoUpdate.mockResolvedValue(undefined)
  databaseMocks.reserveQuota.mockResolvedValue(undefined)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('should search and select distinct nearby locations through the real combobox and provider flow', async () => {
  const fetcher = createFetch()
  vi.stubGlobal('fetch', fetcher)
  const onChange = vi.fn()
  const view = render(() => <PWeatherLocationSearch onChange={onChange} />)
  const input = screen.getByRole('combobox')

  fireEvent.focus(input)
  fireEvent.input(input, {target: {value: 'Location'}})
  await vi.advanceTimersByTimeAsync(300)

  expect(screen.getByRole('option', {name: /Location A/u})).toBeVisible()
  expect(screen.getByRole('option', {name: /Location B/u})).toBeVisible()
  expect(fetcher.mock.calls.map(([request]) => String(request))).toContain(
    '/api/weather/locations?q=Location',
  )
  expect(databaseMocks.values).toHaveBeenCalledWith([
    expect.objectContaining({
      id: 'openweather:51.52001,-0.11001',
      providerLocationId: '51.52001,-0.11001',
    }),
    expect.objectContaining({
      id: 'openweather:51.52004,-0.11004',
      providerLocationId: '51.52004,-0.11004',
    }),
  ])

  await fireEvent.click(screen.getByRole('option', {name: /Location B/u}))
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({id: 'openweather:51.52004,-0.11004', name: 'Location B'}),
  )
  view.unmount()
})
