import type {WeatherLocation} from './contract'
import {searchWeatherLocations} from './location-client'

export interface RestoreWeatherLocationNamesOptions {
  readonly location: WeatherLocation
  readonly search?: typeof searchWeatherLocations
}

/** Restores multilingual names without changing the stored weather location identity. */
export const restoreWeatherLocationNames = async (
  options: RestoreWeatherLocationNamesOptions,
): Promise<WeatherLocation> => {
  const {location} = options
  if (location.legacyCitySlug !== undefined || location.names !== undefined) {
    return location
  }
  const results = await (options.search ?? searchWeatherLocations)({
    query: `${location.name},${location.country}`,
  })
  const match = results.find((candidate) => candidate.id === location.id)
  return match?.names === undefined ? location : {...location, names: match.names}
}
