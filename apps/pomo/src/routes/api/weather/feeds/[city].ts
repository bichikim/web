import type {APIEvent} from '@solidjs/start/server'

import {
  LEGACY_WEATHER_LOCATIONS,
  parseWeatherCitySlug,
  type WeatherLocationId,
} from 'src/features/weather'
import {createWorldWeatherFeedResponse} from 'src/server/weather/world-feed-response'

const JSON_SUFFIX = '.json'

const readCity = (value: string): string =>
  value.endsWith(JSON_SUFFIX) ? value.slice(0, -JSON_SUFFIX.length) : value

const resolveLocationId = (value: string): WeatherLocationId | string => {
  if (value.startsWith('openweather:')) {
    return value
  }

  try {
    return LEGACY_WEATHER_LOCATIONS[parseWeatherCitySlug(value)].id
  } catch {
    return value
  }
}

const createFeedResponse = (value: string): Promise<Response> =>
  createWorldWeatherFeedResponse(resolveLocationId(value))

export const GET = (event: APIEvent): Promise<Response> =>
  createFeedResponse(readCity(event.params.city))

export const HEAD = (event: APIEvent): Promise<Response> =>
  createFeedResponse(readCity(event.params.city))
