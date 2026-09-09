import {WEATHER_CITY_CATALOG} from 'src/features/weather/catalog'
import type {WeatherCitySlug} from 'src/features/weather/contract'
import {WEATHER_COORDINATES} from './coordinates'

export interface WeatherLocation {
  readonly gridX: number
  readonly gridY: number
  readonly label: string
  readonly slug: WeatherCitySlug
}

const WEATHER_LOCATIONS = Object.fromEntries(
  WEATHER_CITY_CATALOG.map((city) => {
    const coordinates = WEATHER_COORDINATES[city.slug]
    return [
      city.slug,
      {
        gridX: coordinates.gridX,
        gridY: coordinates.gridY,
        label: city.names.ko,
        slug: city.slug,
      } satisfies WeatherLocation,
    ]
  }),
) as Readonly<Record<WeatherCitySlug, WeatherLocation>>

export const getWeatherLocation = (slug: WeatherCitySlug): WeatherLocation =>
  WEATHER_LOCATIONS[slug]
