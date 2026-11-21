import type {WeatherCondition} from './contract'

const WEATHER_ICONS = {
  clear: 'i-tabler-sun',
  cloudy: 'i-pomo-scribble-clouds',
  mixed: 'i-tabler-cloud-snow',
  overcast: 'i-tabler-cloud-filled',
  rain: 'i-tabler-cloud-rain',
  snow: 'i-tabler-snowflake',
  unknown: 'i-tabler-cloud-question',
} as const satisfies Readonly<Record<WeatherCondition, string>>

export const getWeatherIcon = (condition: WeatherCondition): string => WEATHER_ICONS[condition]
