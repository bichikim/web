import {z} from 'zod'

import {apiJson} from '../api-json'
import {type WeatherLocation, weatherLocationSchema} from './contract'

const weatherLocationResultsSchema = z.array(weatherLocationSchema)

export interface SearchWeatherLocationsOptions {
  readonly query: string
  readonly signal?: AbortSignal
}

/** Searches registered world-weather locations through Pomo's server boundary. */
export const searchWeatherLocations = (
  options: SearchWeatherLocationsOptions,
): Promise<ReadonlyArray<WeatherLocation>> => {
  const search = new URLSearchParams()
  search.set('q', options.query)
  return apiJson(`weather/locations?${search}`, {
    headers: {accept: 'application/json'},
    responseSchema: weatherLocationResultsSchema,
    signal: options.signal,
  })
}
