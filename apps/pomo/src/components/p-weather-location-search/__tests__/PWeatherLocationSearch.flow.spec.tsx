/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import type {WeatherLocation} from '../../../features/weather'
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

interface ChildProps {
  readonly children?: JSX.Element
}

interface ComboboxBoundary {
  readonly onChange: (location: WeatherLocation | null) => void
  readonly onInputChange: (query: string) => void
  readonly options: ReadonlyArray<WeatherLocation>
}

const comboboxMocks = vi.hoisted(() => ({root: vi.fn<(props: ComboboxBoundary) => JSX.Element>()}))

vi.mock('src/env', () => ({env: {OPENWEATHER_API_KEY: 'weather-search-test-key'}}))
vi.mock('src/server/database', async (importOriginal) => {
  const database = await importOriginal<typeof import('src/server/database')>()
  return {...database, getDatabase: databaseMocks.getDatabase}
})
vi.mock('src/server/weather/provider-quota', () => ({
  reserveOpenWeatherRequest: databaseMocks.reserveQuota,
}))
vi.mock('@kobalte/core/combobox', () => ({Combobox: comboboxMocks.root}))

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

const flushMicrotasks = () =>
  Array.from({length: 32}).reduce<Promise<void>>(
    (promise) => promise.then(() => undefined),
    Promise.resolve(),
  )

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
  const passthrough = (props: ChildProps) => <>{props.children}</>
  comboboxMocks.root.mockImplementation(() => null)
  Object.assign(comboboxMocks.root, {
    Content: passthrough,
    Control: passthrough,
    HiddenSelect: () => null,
    Input: passthrough,
    Item: passthrough,
    ItemDescription: passthrough,
    ItemLabel: passthrough,
    Label: passthrough,
    Listbox: passthrough,
    Portal: passthrough,
  })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('should map real provider search results to distinct combobox options', async () => {
  const fetcher = createFetch()
  vi.stubGlobal('fetch', fetcher)
  const onChange = vi.fn()
  const view = render(() => <PWeatherLocationSearch onChange={onChange} />)
  const props = comboboxMocks.root.mock.calls[0]?.[0]
  expect(props).toBeDefined()
  if (props === undefined) {
    throw new Error('Combobox props were not captured')
  }

  props.onInputChange('Location')
  vi.advanceTimersByTime(300)
  await flushMicrotasks()

  expect(props.options.map(({id}) => id)).toEqual([
    'openweather:51.52001,-0.11001',
    'openweather:51.52004,-0.11004',
  ])
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

  props.onChange(props.options[1] ?? null)
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({id: 'openweather:51.52004,-0.11004', name: 'Location B'}),
  )
  view.unmount()
})
