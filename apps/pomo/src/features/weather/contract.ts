import {z} from 'zod'

export const WEATHER_CITY_SLUGS = [
  'seoul',
  'busan',
  'daegu',
  'incheon',
  'gwangju',
  'daejeon',
  'ulsan',
  'jeju',
] as const
export type WeatherCitySlug = (typeof WEATHER_CITY_SLUGS)[number]
const weatherCitySlugSchema = z.enum(WEATHER_CITY_SLUGS)

const weatherLocationIdSchema = z
  .string()
  .regex(/^openweather:(?:-?\d{1,2}\.\d{4},-?\d{1,3}\.\d{4}|legacy:[a-z]+)$/u)
export type WeatherLocationId = `openweather:${string}`

export interface WeatherLocation {
  readonly country: string
  readonly id: WeatherLocationId
  readonly legacyCitySlug?: WeatherCitySlug
  readonly name: string
  readonly region: string
}

export const weatherLocationSchema: z.ZodType<WeatherLocation> = z.object({
  country: z.string().min(1),
  id: weatherLocationIdSchema as z.ZodType<WeatherLocationId>,
  legacyCitySlug: weatherCitySlugSchema.optional(),
  name: z.string().min(1),
  region: z.string(),
})

export const WEATHER_PRECIPITATIONS = ['none', 'rain', 'mixed', 'snow'] as const
export type WeatherPrecipitation = (typeof WEATHER_PRECIPITATIONS)[number]

export const WEATHER_SKIES = ['clear', 'cloudy', 'overcast'] as const
export type WeatherSky = (typeof WEATHER_SKIES)[number]

export const WEATHER_CONDITIONS = [
  'unknown',
  'clear',
  'cloudy',
  'overcast',
  'rain',
  'mixed',
  'snow',
] as const
export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number]

interface CurrentWeather {
  readonly condition: WeatherCondition
  readonly humidityPercent: number | null
  readonly precipitationMillimeters: number | null
  readonly temperatureCelsius: number | null
}

export interface LegacyWeatherFeed {
  readonly city: {readonly label: string; readonly slug: WeatherCitySlug}
  readonly current: {
    readonly condition: WeatherCondition
    readonly humidityPercent: number | null
    readonly precipitationMillimeters: number | null
    readonly temperatureCelsius: number | null
  }
  readonly expiresAt: string
  readonly observedAt: string
  readonly schemaVersion: 1
  readonly source: {
    readonly name: '기상청'
    readonly url: 'https://www.data.go.kr/data/15084084/openapi.do'
  }
  readonly stale: boolean
  readonly updatedAt: string
}

export interface WeatherFeed {
  readonly current: CurrentWeather
  readonly expiresAt: string
  readonly location: WeatherLocation
  readonly observedAt: string
  readonly schemaVersion: 2
  readonly source: {
    readonly name: 'OpenWeather'
    readonly url: 'https://openweathermap.org/'
  }
  readonly stale: boolean
  readonly updatedAt: string
}

export const legacyWeatherFeedSchema: z.ZodType<LegacyWeatherFeed> = z.object({
  city: z.object({label: z.string().min(1), slug: z.enum(WEATHER_CITY_SLUGS)}),
  current: z.object({
    condition: z.enum(WEATHER_CONDITIONS),
    humidityPercent: z.number().nullable(),
    precipitationMillimeters: z.number().nullable(),
    temperatureCelsius: z.number().nullable(),
  }),
  expiresAt: z.string().datetime({offset: true}),
  observedAt: z.string().datetime({offset: true}),
  schemaVersion: z.literal(1),
  source: z.object({
    name: z.literal('기상청'),
    url: z.literal('https://www.data.go.kr/data/15084084/openapi.do'),
  }),
  stale: z.boolean(),
  updatedAt: z.string().datetime({offset: true}),
})

export const weatherFeedSchema: z.ZodType<WeatherFeed> = z.object({
  current: z.object({
    condition: z.enum(WEATHER_CONDITIONS),
    humidityPercent: z.number().nullable(),
    precipitationMillimeters: z.number().nullable(),
    temperatureCelsius: z.number().nullable(),
  }),
  expiresAt: z.string().datetime({offset: true}),
  location: weatherLocationSchema,
  observedAt: z.string().datetime({offset: true}),
  schemaVersion: z.literal(2),
  source: z.object({
    name: z.literal('OpenWeather'),
    url: z.literal('https://openweathermap.org/'),
  }),
  stale: z.boolean(),
  updatedAt: z.string().datetime({offset: true}),
})

/** Parses the versioned weather boundary returned by the Pomo server. */
export const parseWeatherFeed = (value: unknown): WeatherFeed => weatherFeedSchema.parse(value)

/** Parses a location returned by the world-weather search boundary. */
export const parseWeatherLocation = (value: unknown): WeatherLocation =>
  weatherLocationSchema.parse(value)

/** Parses a world-weather location identifier at request boundaries. */
export const parseWeatherLocationId = (value: unknown): WeatherLocationId =>
  weatherLocationIdSchema.parse(value) as WeatherLocationId

/** Parses a city identifier at a storage or request boundary. */
export const parseWeatherCitySlug = (value: unknown): WeatherCitySlug =>
  weatherCitySlugSchema.parse(value)
