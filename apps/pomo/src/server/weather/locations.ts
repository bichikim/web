import type {WeatherCitySlug} from 'src/features/weather'

export interface WeatherLocation {
  readonly gridX: number
  readonly gridY: number
  readonly label: string
  readonly slug: WeatherCitySlug
}

const WEATHER_LOCATIONS = {
  seoul: {gridX: 60, gridY: 127, label: '서울', slug: 'seoul'},
} as const satisfies Readonly<Record<WeatherCitySlug, WeatherLocation>>

export const getWeatherLocation = (slug: WeatherCitySlug): WeatherLocation =>
  WEATHER_LOCATIONS[slug]
