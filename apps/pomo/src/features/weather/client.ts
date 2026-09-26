import {z} from 'zod'

import {parseJsonResponse} from '../api-json'
import {apiFetch, parseRetryAfterSeconds} from '../http-client'
import {type WeatherFeed, weatherFeedSchema, type WeatherLocationId} from './contract'

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

/** Fetches and validates the public weather feed boundary. */
export const fetchWeatherFeed = async (
  locationId: WeatherLocationId,
): Promise<WeatherFeedRequestResult> => {
  const response = await apiFetch(`weather/feeds/${encodeURIComponent(locationId)}.json`, {
    headers: {accept: 'application/json'},
  })

  if (response.status === HTTP_SERVICE_UNAVAILABLE) {
    const unavailable = await parseJsonResponse(response, weatherUnavailableSchema)
    const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get('Retry-After'))
    const retryAfterMilliseconds =
      retryAfterSeconds === null ? null : retryAfterSeconds * MILLISECONDS_PER_SECOND

    return unavailable.code === 'weather_collecting'
      ? {retryAfterMilliseconds, status: 'collecting'}
      : {retryAfterMilliseconds, status: 'unavailable'}
  }

  if (!response.ok) {
    throw new Error(`Weather feed request failed with status ${response.status}`)
  }

  const requestedLocationFeedSchema = weatherFeedSchema.refine(
    (feed) => feed.location.id === locationId,
    {
      message: 'Weather feed location does not match the requested location',
      path: ['location', 'id'],
    },
  )

  return {feed: await parseJsonResponse(response, requestedLocationFeedSchema), status: 'available'}
}
