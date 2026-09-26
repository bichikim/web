import {parseWeatherExpiryMs} from './parse-weather-expiry-ms'
import type {QueryRevalidationSchedule} from '../query-revalidation'
import type {WeatherLocationId} from './contract'
import type {WeatherFeedQueryResult} from './query'

const MINIMUM_REFRESH_DELAY_MILLISECONDS = 1_000
const REFRESH_SAFETY_DELAY_MILLISECONDS = 1_000
const WEATHER_RETRY_MILLISECONDS = 60_000

export interface ResolveWeatherRevalidationScheduleOptions {
  readonly active: boolean
  readonly locationId: WeatherLocationId
  readonly result: WeatherFeedQueryResult | undefined
}

/** Selects whether and when the current weather query should be revalidated. */
export const resolveWeatherRevalidationSchedule = (
  options: ResolveWeatherRevalidationScheduleOptions,
): QueryRevalidationSchedule => {
  const {result} = options
  if (!options.active || result === undefined || result.locationId !== options.locationId) {
    return null
  }

  switch (result.status) {
    case 'available': {
      const expiresAtMilliseconds = parseWeatherExpiryMs(result.feed.expiresAt)

      return {
        kind: 'after-delay',
        milliseconds:
          expiresAtMilliseconds === null
            ? MINIMUM_REFRESH_DELAY_MILLISECONDS
            : Math.max(
                MINIMUM_REFRESH_DELAY_MILLISECONDS,
                expiresAtMilliseconds - Date.now() + REFRESH_SAFETY_DELAY_MILLISECONDS,
              ),
      }
    }
    case 'collecting':
    case 'unavailable':
      return {
        kind: 'after-delay',
        milliseconds: result.retryAfterMilliseconds ?? WEATHER_RETRY_MILLISECONDS,
      }
    case 'failed':
      return {kind: 'after-delay', milliseconds: WEATHER_RETRY_MILLISECONDS}
    default: {
      const exhaustiveResult: never = result
      return exhaustiveResult
    }
  }
}
