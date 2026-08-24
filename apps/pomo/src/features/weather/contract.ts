import {z} from 'zod'

export const WEATHER_CITY_SLUGS = ['seoul'] as const
export type WeatherCitySlug = (typeof WEATHER_CITY_SLUGS)[number]
const weatherCitySlugSchema = z.enum(WEATHER_CITY_SLUGS)

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

export interface WeatherFeed {
  readonly city: {
    readonly label: string
    readonly slug: WeatherCitySlug
  }
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

export const weatherFeedSchema: z.ZodType<WeatherFeed> = z.object({
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

/** Parses the versioned weather boundary returned by the Pomo server. */
export const parseWeatherFeed = (value: unknown): WeatherFeed => weatherFeedSchema.parse(value)

/** Parses a city identifier at a storage or request boundary. */
export const parseWeatherCitySlug = (value: unknown): WeatherCitySlug =>
  weatherCitySlugSchema.parse(value)
