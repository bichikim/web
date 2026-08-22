import type {WeatherCondition, WeatherPrecipitation, WeatherSky} from './contract'

interface ResolveWeatherConditionOptions {
  readonly precipitation: WeatherPrecipitation
  readonly sky: WeatherSky | null
}

/** Combines normalized precipitation and sky values into Pomo's display condition. */
export const resolveWeatherCondition = (
  options: ResolveWeatherConditionOptions,
): WeatherCondition => {
  if (options.precipitation !== 'none') {
    return options.precipitation
  }

  return options.sky ?? 'unknown'
}
