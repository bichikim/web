import type {WeatherCondition} from './contract'

export const WEATHER_SCENE_MODES = ['auto', 'clear', 'rain', 'snow', 'cloudy', 'overcast'] as const
export type WeatherSceneMode = (typeof WEATHER_SCENE_MODES)[number]
export type WeatherSceneCondition = Exclude<WeatherSceneMode, 'auto'>

export const isWeatherSceneMode = (value: unknown): value is WeatherSceneMode =>
  typeof value === 'string' && WEATHER_SCENE_MODES.some((mode) => mode === value)

/** Resolves the selected or observed weather into an available scene condition. */
export const resolveWeatherSceneCondition = (
  mode: WeatherSceneMode,
  observedCondition: WeatherCondition,
): WeatherSceneCondition => {
  if (mode !== 'auto') {
    return mode
  }

  switch (observedCondition) {
    case 'clear':
      return 'clear'
    case 'cloudy':
      return 'cloudy'
    case 'overcast':
      return 'overcast'
    case 'mixed':
    case 'rain':
      return 'rain'
    case 'snow':
      return 'snow'
    case 'unknown':
      return 'clear'
  }
}
