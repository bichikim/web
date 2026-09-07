import {query} from '@solidjs/router'

import type {WeatherFeed, WeatherLocationId} from './contract'
import {fetchWeatherFeed} from './client'

interface AvailableWeatherFeedQueryResult {
  readonly feed: WeatherFeed
  readonly locationId: WeatherLocationId
  readonly status: 'available'
}

interface CollectingWeatherFeedQueryResult {
  readonly locationId: WeatherLocationId
  readonly retryAfterMilliseconds: number | null
  readonly status: 'collecting'
}

interface FailedWeatherFeedQueryResult {
  readonly locationId: WeatherLocationId
  readonly status: 'failed'
}

interface UnavailableWeatherFeedQueryResult {
  readonly locationId: WeatherLocationId
  readonly retryAfterMilliseconds: number | null
  readonly status: 'unavailable'
}

export type WeatherFeedQueryResult =
  | AvailableWeatherFeedQueryResult
  | CollectingWeatherFeedQueryResult
  | FailedWeatherFeedQueryResult
  | UnavailableWeatherFeedQueryResult

const requestWeatherFeed = async (
  locationId: WeatherLocationId,
): Promise<WeatherFeedQueryResult> => {
  try {
    const result = await fetchWeatherFeed(locationId)
    return {...result, locationId}
  } catch {
    return {locationId, status: 'failed'}
  }
}

export const weatherFeedQuery = query(requestWeatherFeed, 'weather-feed')
