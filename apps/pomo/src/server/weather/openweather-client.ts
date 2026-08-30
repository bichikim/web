import 'server-only'

// oxlint-disable eslint/no-magic-numbers, eslint-js/camelcase, eslint/id-length -- OpenWeather DTO names and condition codes are fixed external contracts.

import {z} from 'zod'

import type {WeatherPrecipitation, WeatherSky} from 'src/features/weather'
import {env} from 'src/env'

const OPENWEATHER_ORIGIN = 'https://api.openweathermap.org'
const SEARCH_RESULT_LIMIT = 5

const openWeatherSearchLocationSchema = z.object({
  country: z.string().length(2),
  lat: z.number().min(-90).max(90),
  local_names: z.record(z.string(), z.string()).optional(),
  lon: z.number().min(-180).max(180),
  name: z.string().min(1),
  state: z.string().optional(),
})

const openWeatherSearchSchema = z.array(openWeatherSearchLocationSchema)

const precipitationSchema = z.object({'1h': z.number().nonnegative()})
const openWeatherCurrentSchema = z.object({
  dt: z.number().int().nonnegative(),
  main: z.object({
    humidity: z.number().min(0).max(100),
    temp: z.number(),
  }),
  rain: precipitationSchema.optional(),
  snow: precipitationSchema.optional(),
  weather: z.array(z.object({id: z.number().int()})).min(1),
  wind: z.object({
    speed: z.number().nonnegative(),
  }),
})

const MIXED_CODES = new Set([511, 611, 612, 613, 615, 616])

export interface OpenWeatherSearchLocation {
  readonly country: string
  readonly latitude: number
  readonly longitude: number
  readonly name: string
  readonly providerLocationId: string
  readonly region: string
}

export interface OpenWeatherCurrentWeather {
  readonly humidityPercent: number
  readonly observedAt: Date
  readonly precipitation: WeatherPrecipitation
  readonly precipitationMillimeters: number
  readonly sky: WeatherSky | null
  readonly temperatureCelsius: number
  readonly windSpeedMetersPerSecond: number
}

export type OpenWeatherErrorKind = 'http' | 'schema'

interface OpenWeatherErrorOptions {
  readonly cause?: unknown
  readonly kind: OpenWeatherErrorKind
  readonly status?: number
}

export class OpenWeatherError extends Error {
  readonly kind: OpenWeatherErrorKind
  readonly status?: number

  constructor(options: OpenWeatherErrorOptions) {
    super(
      options.kind === 'http'
        ? `OpenWeather request failed with HTTP ${options.status ?? 'unknown'}`
        : 'OpenWeather response did not match the expected schema',
      {cause: options.cause},
    )
    this.name = 'OpenWeatherError'
    this.kind = options.kind
    this.status = options.status
  }
}

interface OpenWeatherRequestOptions {
  readonly fetcher?: typeof fetch
  readonly url: URL
}

const requestOpenWeather = async (options: OpenWeatherRequestOptions): Promise<unknown> => {
  const response = await (options.fetcher ?? fetch)(options.url, {
    headers: {accept: 'application/json'},
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new OpenWeatherError({kind: 'http', status: response.status})
  }

  return response.json()
}

export interface SearchOpenWeatherLocationsOptions {
  readonly fetcher?: typeof fetch
  readonly query: string
}

const createProviderLocationId = (latitude: number, longitude: number): string =>
  `${latitude.toFixed(4)},${longitude.toFixed(4)}`

/** Searches OpenWeather without exposing provider DTOs or credentials to callers. */
export const searchOpenWeatherLocations = async (
  options: SearchOpenWeatherLocationsOptions,
): Promise<ReadonlyArray<OpenWeatherSearchLocation>> => {
  const url = new URL('/geo/1.0/direct', OPENWEATHER_ORIGIN)
  url.search = new URLSearchParams({
    appid: env.OPENWEATHER_API_KEY,
    limit: SEARCH_RESULT_LIMIT.toString(),
    q: options.query,
  }).toString()
  const value = await requestOpenWeather({fetcher: options.fetcher, url})
  const parsed = openWeatherSearchSchema.safeParse(value)

  if (!parsed.success) {
    throw new OpenWeatherError({cause: parsed.error, kind: 'schema'})
  }

  return parsed.data.map((location) => ({
    country: location.country,
    latitude: location.lat,
    longitude: location.lon,
    name: location.name,
    providerLocationId: createProviderLocationId(location.lat, location.lon),
    region: location.state ?? '',
  }))
}

interface NormalizedCondition {
  readonly precipitation: WeatherPrecipitation
  readonly sky: WeatherSky | null
}

/** Reduces provider-specific conditions to the scene states Pomo can render. */
export const normalizeOpenWeatherCondition = (code: number): NormalizedCondition => {
  if (code === 800) {
    return {precipitation: 'none', sky: 'clear'}
  }
  if (code === 801 || code === 802 || (code >= 700 && code < 800)) {
    return {precipitation: 'none', sky: 'cloudy'}
  }
  if (code === 803 || code === 804) {
    return {precipitation: 'none', sky: 'overcast'}
  }
  if (MIXED_CODES.has(code)) {
    return {precipitation: 'mixed', sky: null}
  }
  if (code >= 600 && code < 700) {
    return {precipitation: 'snow', sky: null}
  }
  if (code >= 200 && code < 600) {
    return {precipitation: 'rain', sky: null}
  }

  return {precipitation: 'none', sky: null}
}

export interface FetchOpenWeatherCurrentOptions {
  readonly fetcher?: typeof fetch
  readonly latitude: number
  readonly longitude: number
}

/** Fetches current weather for one fixed coordinate. */
export const fetchOpenWeatherCurrent = async (
  options: FetchOpenWeatherCurrentOptions,
): Promise<OpenWeatherCurrentWeather> => {
  const url = new URL('/data/2.5/weather', OPENWEATHER_ORIGIN)
  url.search = new URLSearchParams({
    appid: env.OPENWEATHER_API_KEY,
    lat: options.latitude.toString(),
    lon: options.longitude.toString(),
    units: 'metric',
  }).toString()
  const value = await requestOpenWeather({fetcher: options.fetcher, url})
  const parsed = openWeatherCurrentSchema.safeParse(value)

  if (!parsed.success) {
    throw new OpenWeatherError({cause: parsed.error, kind: 'schema'})
  }

  const current = parsed.data
  const condition = normalizeOpenWeatherCondition(current.weather[0].id)

  return {
    humidityPercent: current.main.humidity,
    observedAt: new Date(current.dt * 1_000),
    precipitation: condition.precipitation,
    precipitationMillimeters: (current.rain?.['1h'] ?? 0) + (current.snow?.['1h'] ?? 0),
    sky: condition.sky,
    temperatureCelsius: current.main.temp,
    windSpeedMetersPerSecond: current.wind.speed,
  }
}
