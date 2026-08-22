import {z} from 'zod'

import {parseWeatherFeed, type WeatherCitySlug, type WeatherFeed} from './contract'

const MILLISECONDS_PER_SECOND = 1_000
const HTTP_SERVICE_UNAVAILABLE = 503
const weatherUnavailableSchema = z.object({
  code: z.enum(['weather_collecting', 'weather_unavailable']),
})

interface AvailableWeatherFeedResult {
  readonly feed: WeatherFeed
  readonly status: 'available'
}

interface CollectingWeatherFeedResult {
  readonly retryAfterMilliseconds: number | null
  readonly status: 'collecting'
}

interface UnavailableWeatherFeedResult {
  readonly retryAfterMilliseconds: number | null
  readonly status: 'unavailable'
}

export type WeatherFeedRequestResult =
  | AvailableWeatherFeedResult
  | CollectingWeatherFeedResult
  | UnavailableWeatherFeedResult

const getWeatherFeedUrl = (citySlug: WeatherCitySlug): URL => {
  const origin = import.meta.env.POMO_IS_APPS_IN_TOSS
    ? import.meta.env.POMO_PUBLIC_ORIGIN
    : window.location.origin

  return new URL(`/api/weather/feeds/${citySlug}.json`, origin)
}

const parseRetryAfterMilliseconds = (value: string | null): number | null => {
  if (value === null) {
    return null
  }

  const seconds = Number(value)

  return Number.isInteger(seconds) && seconds >= 1 ? seconds * MILLISECONDS_PER_SECOND : null
}

/** Fetches and validates the public weather feed boundary. */
export const fetchWeatherFeed = async (
  citySlug: WeatherCitySlug,
): Promise<WeatherFeedRequestResult> => {
  const response = await fetch(getWeatherFeedUrl(citySlug), {
    headers: {accept: 'application/json'},
  })

  if (response.status === HTTP_SERVICE_UNAVAILABLE) {
    const unavailable = weatherUnavailableSchema.parse(await response.json())
    const retryAfterMilliseconds = parseRetryAfterMilliseconds(response.headers.get('Retry-After'))

    return unavailable.code === 'weather_collecting'
      ? {retryAfterMilliseconds, status: 'collecting'}
      : {retryAfterMilliseconds, status: 'unavailable'}
  }

  if (!response.ok) {
    throw new Error(`Weather feed request failed with status ${response.status}`)
  }

  const value: unknown = await response.json()
  return {feed: parseWeatherFeed(value), status: 'available'}
}
