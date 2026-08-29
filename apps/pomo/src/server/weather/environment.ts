import 'server-only'

import {readString} from '../environment/schema'

export interface WeatherEnvironment {
  readonly KMA_SERVICE_KEY?: string
  readonly OPENWEATHER_API_KEY?: string
}

/** Returns the decoded public-data service key used only by the server adapter. */
export const getKmaServiceKey = (environment: WeatherEnvironment = process.env): string => {
  return readString('KMA_SERVICE_KEY', environment.KMA_SERVICE_KEY)
}

/** Returns the OpenWeather credential used only by the server adapter. */
export const getOpenWeatherApiKey = (environment: WeatherEnvironment = process.env): string =>
  readString('OPENWEATHER_API_KEY', environment.OPENWEATHER_API_KEY)
