import type {WeatherCitySlug} from 'src/features/weather'

export interface WeatherLocation {
  readonly gridX: number
  readonly gridY: number
  readonly label: string
  readonly slug: WeatherCitySlug
}

const WEATHER_LOCATIONS = {
  busan: {gridX: 98, gridY: 76, label: '부산', slug: 'busan'},
  daegu: {gridX: 89, gridY: 90, label: '대구', slug: 'daegu'},
  daejeon: {gridX: 67, gridY: 100, label: '대전', slug: 'daejeon'},
  gwangju: {gridX: 58, gridY: 74, label: '광주', slug: 'gwangju'},
  incheon: {gridX: 55, gridY: 124, label: '인천', slug: 'incheon'},
  jeju: {gridX: 52, gridY: 38, label: '제주', slug: 'jeju'},
  seoul: {gridX: 60, gridY: 127, label: '서울', slug: 'seoul'},
  ulsan: {gridX: 102, gridY: 84, label: '울산', slug: 'ulsan'},
} as const satisfies Readonly<Record<WeatherCitySlug, WeatherLocation>>

export const getWeatherLocation = (slug: WeatherCitySlug): WeatherLocation =>
  WEATHER_LOCATIONS[slug]
