import {WEATHER_CITY_CATALOG} from './catalog'
import type {WeatherCitySlug, WeatherLocation} from './contract'

export interface LegacyWeatherLocation extends WeatherLocation {
  readonly legacyCitySlug: WeatherCitySlug
}

export const LEGACY_WEATHER_LOCATIONS = Object.fromEntries(
  WEATHER_CITY_CATALOG.toSorted((left, right) => left.slug.localeCompare(right.slug)).map(
    (city): [WeatherCitySlug, LegacyWeatherLocation] => [
      city.slug,
      {
        country: '대한민국',
        id: `openweather:legacy:${city.slug}`,
        legacyCitySlug: city.slug,
        name: city.names.ko,
        region: city.region,
      },
    ],
  ),
) as Readonly<Record<WeatherCitySlug, LegacyWeatherLocation>>

export const DEFAULT_WEATHER_LOCATION = LEGACY_WEATHER_LOCATIONS.seoul
