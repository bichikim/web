import 'server-only'

export interface WeatherEnvironment {
  readonly KMA_SERVICE_KEY?: string
}

/** Returns the decoded public-data service key used only by the server adapter. */
export const getKmaServiceKey = (environment: WeatherEnvironment = process.env): string => {
  const serviceKey = environment.KMA_SERVICE_KEY?.trim()

  if (!serviceKey) {
    throw new TypeError('KMA_SERVICE_KEY is not set')
  }

  return serviceKey
}
