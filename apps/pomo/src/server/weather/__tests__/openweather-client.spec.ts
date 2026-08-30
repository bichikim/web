import {describe, expect, it, vi} from 'vitest'

import {
  fetchOpenWeatherCurrent,
  normalizeOpenWeatherCondition,
  OpenWeatherError,
  searchOpenWeatherLocations,
} from '../openweather-client'

const ENVIRONMENT = {OPENWEATHER_API_KEY: 'secret-key'} as const

const createCurrentResponse = (code = 802) => ({
  dt: 1_725_000_000,
  main: {
    humidity: 74,
    temp: 21.5,
  },
  rain: {'1h': 1.2},
  weather: [{id: code}],
  wind: {speed: 5},
})

describe('searchOpenWeatherLocations', () => {
  it('should return domain locations and keep the API key on the server request', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json([
        {
          country: 'GB',
          lat: 51.52,
          local_names: {ko: '런던'},
          lon: -0.11,
          name: 'London',
          state: 'England',
        },
      ]),
    )

    const result = await searchOpenWeatherLocations({
      environment: ENVIRONMENT,
      fetcher,
      query: 'lond',
    })

    expect(result).toEqual([
      {
        country: 'GB',
        latitude: 51.52,
        longitude: -0.11,
        name: 'London',
        providerLocationId: '51.5200,-0.1100',
        region: 'England',
      },
    ])
    const requestUrl = new URL(fetcher.mock.calls[0]?.[0] as URL)
    expect(requestUrl.pathname).toBe('/geo/1.0/direct')
    expect(requestUrl.searchParams.get('appid')).toBe('secret-key')
    expect(requestUrl.searchParams.get('limit')).toBe('5')
    expect(requestUrl.searchParams.get('q')).toBe('lond')
  })

  it('should use an empty region when OpenWeather omits state', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json([{country: 'KR', lat: 37.5665, lon: 126.978, name: 'Seoul'}]),
      )

    await expect(
      searchOpenWeatherLocations({environment: ENVIRONMENT, fetcher, query: 'Seoul'}),
    ).resolves.toEqual([
      expect.objectContaining({providerLocationId: '37.5665,126.9780', region: ''}),
    ])
  })

  it('should use the runtime fetcher and describe an HTTP failure without a status', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json([]))
    vi.stubGlobal('fetch', fetcher)

    await expect(
      searchOpenWeatherLocations({environment: ENVIRONMENT, query: 'none'}),
    ).resolves.toEqual([])
    expect(fetcher).toHaveBeenCalledOnce()
    expect(new OpenWeatherError({kind: 'http'}).message).toContain('unknown')
    vi.unstubAllGlobals()
  })

  it('should reject HTTP and schema failures without returning provider bodies', async () => {
    const unavailableFetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, {status: 403}))
    const invalidFetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json([{id: 'invalid'}]))

    await expect(
      searchOpenWeatherLocations({
        environment: ENVIRONMENT,
        fetcher: unavailableFetcher,
        query: 'seoul',
      }),
    ).rejects.toThrow('OpenWeather request failed with HTTP 403')
    await expect(
      searchOpenWeatherLocations({
        environment: ENVIRONMENT,
        fetcher: invalidFetcher,
        query: 'seoul',
      }),
    ).rejects.toThrow('OpenWeather response did not match the expected schema')
  })
})

describe('normalizeOpenWeatherCondition', () => {
  it.each([
    [800, {precipitation: 'none', sky: 'clear'}],
    [801, {precipitation: 'none', sky: 'cloudy'}],
    [802, {precipitation: 'none', sky: 'cloudy'}],
    [741, {precipitation: 'none', sky: 'cloudy'}],
    [803, {precipitation: 'none', sky: 'overcast'}],
    [804, {precipitation: 'none', sky: 'overcast'}],
    [500, {precipitation: 'rain', sky: null}],
    [511, {precipitation: 'mixed', sky: null}],
    [615, {precipitation: 'mixed', sky: null}],
    [600, {precipitation: 'snow', sky: null}],
    [9999, {precipitation: 'none', sky: null}],
  ] as const)('should normalize condition code %s', (code, expected) => {
    expect(normalizeOpenWeatherCondition(code)).toEqual(expected)
  })
})

describe('fetchOpenWeatherCurrent', () => {
  it('should return normalized current weather for the requested coordinate', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(createCurrentResponse()))

    const result = await fetchOpenWeatherCurrent({
      environment: ENVIRONMENT,
      fetcher,
      latitude: 35.69,
      longitude: 139.69,
    })

    expect(result).toEqual({
      humidityPercent: 74,
      observedAt: new Date(1_725_000_000_000),
      precipitation: 'none',
      precipitationMillimeters: 1.2,
      sky: 'cloudy',
      temperatureCelsius: 21.5,
      windSpeedMetersPerSecond: 5,
    })
    const requestUrl = new URL(fetcher.mock.calls[0]?.[0] as URL)
    expect(requestUrl.pathname).toBe('/data/2.5/weather')
    expect(requestUrl.searchParams.get('appid')).toBe('secret-key')
    expect(requestUrl.searchParams.get('lat')).toBe('35.69')
    expect(requestUrl.searchParams.get('lon')).toBe('139.69')
    expect(requestUrl.searchParams.get('units')).toBe('metric')
  })

  it('should combine optional rain and snow amounts', async () => {
    const response = createCurrentResponse(600)
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({...response, rain: undefined, snow: {'1h': 0.8}}))

    await expect(
      fetchOpenWeatherCurrent({
        environment: ENVIRONMENT,
        fetcher,
        latitude: 37.5665,
        longitude: 126.978,
      }),
    ).resolves.toMatchObject({
      precipitation: 'snow',
      precipitationMillimeters: 0.8,
    })
  })

  it('should preserve an unknown current-weather condition', () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(createCurrentResponse(-1)))

    return expect(
      fetchOpenWeatherCurrent({
        environment: ENVIRONMENT,
        fetcher,
        latitude: 35.69,
        longitude: 139.69,
      }),
    ).resolves.toMatchObject({precipitation: 'none', sky: null})
  })

  it('should reject an invalid current-weather response', () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({main: {}}))

    return expect(
      fetchOpenWeatherCurrent({
        environment: ENVIRONMENT,
        fetcher,
        latitude: 35.69,
        longitude: 139.69,
      }),
    ).rejects.toThrow('OpenWeather response did not match the expected schema')
  })
})
