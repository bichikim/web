import type {WeatherCondition} from './contract'

export interface WeatherPresentation {
  readonly icon: string
  readonly label: string
}

const WEATHER_PRESENTATIONS = {
  clear: {icon: 'i-tabler-sun', label: '맑음'},
  cloudy: {icon: 'i-pomo-scribble-clouds', label: '구름 많음'},
  mixed: {icon: 'i-tabler-cloud-snow', label: '비 또는 눈'},
  overcast: {icon: 'i-tabler-cloud-filled', label: '흐림'},
  rain: {icon: 'i-tabler-cloud-rain', label: '비'},
  snow: {icon: 'i-tabler-snowflake', label: '눈'},
  unknown: {icon: 'i-tabler-cloud-question', label: '날씨 확인 중'},
} as const satisfies Readonly<Record<WeatherCondition, WeatherPresentation>>

export const getWeatherPresentation = (condition: WeatherCondition): WeatherPresentation =>
  WEATHER_PRESENTATIONS[condition]
