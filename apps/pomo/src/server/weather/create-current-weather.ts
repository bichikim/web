import {resolveWeatherCondition} from 'src/features/weather/condition'
import type {WeatherFeed, WeatherPrecipitation, WeatherSky} from 'src/features/weather/contract'

export interface WeatherConditionRecord {
  readonly humidityPercent: number | null
  readonly precipitation: WeatherPrecipitation
  readonly precipitationMillimeters: number | null
  readonly sky: WeatherSky | null
  readonly temperatureCelsius: number | null
}

/** Maps a stored observation onto the public current-weather payload. */
export const createCurrentWeather = (record: WeatherConditionRecord): WeatherFeed['current'] => ({
  condition: resolveWeatherCondition({precipitation: record.precipitation, sky: record.sky}),
  humidityPercent: record.humidityPercent,
  precipitationMillimeters: record.precipitationMillimeters,
  temperatureCelsius: record.temperatureCelsius,
})
