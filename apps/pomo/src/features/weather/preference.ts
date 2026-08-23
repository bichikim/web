import {Storage} from '@apps-in-toss/web-framework'

import {parseWeatherCitySlug, type WeatherCitySlug} from './contract'

const WEATHER_PREFERENCE_STORAGE_KEY = 'pomo:weather-preference:v1'

export interface WeatherPreference {
  readonly citySlug: WeatherCitySlug
  readonly enabled: boolean
}

export const DEFAULT_WEATHER_PREFERENCE = {
  citySlug: 'seoul',
  enabled: true,
} satisfies WeatherPreference

const parseWeatherPreference = (storedValue: string | null): WeatherPreference | null => {
  if (storedValue === null) {
    return null
  }

  try {
    const value: unknown = JSON.parse(storedValue)

    if (typeof value !== 'object' || value === null || !('citySlug' in value)) {
      return null
    }

    if (!('enabled' in value) || typeof value.enabled !== 'boolean') {
      return null
    }

    return {citySlug: parseWeatherCitySlug(value.citySlug), enabled: value.enabled}
  } catch {
    return null
  }
}

const hasNativeBridge = () => 'ReactNativeWebView' in window

const readWebPreference = (): WeatherPreference | null => {
  try {
    return parseWeatherPreference(localStorage.getItem(WEATHER_PREFERENCE_STORAGE_KEY))
  } catch {
    return null
  }
}

const writeWebPreference = (preference: WeatherPreference) => {
  try {
    localStorage.setItem(WEATHER_PREFERENCE_STORAGE_KEY, JSON.stringify(preference))
  } catch {
    // Browser storage is best-effort; the in-memory preference remains active.
  }
}

/** Reads the weather preference from the active browser or app runtime. */
export const readWeatherPreference = async (): Promise<WeatherPreference> => {
  const webPreference = readWebPreference()

  if (webPreference !== null) {
    return webPreference
  }

  if (!hasNativeBridge()) {
    return DEFAULT_WEATHER_PREFERENCE
  }

  try {
    const nativePreference = parseWeatherPreference(
      await Storage.getItem(WEATHER_PREFERENCE_STORAGE_KEY),
    )

    if (nativePreference === null) {
      return DEFAULT_WEATHER_PREFERENCE
    }

    writeWebPreference(nativePreference)
    return nativePreference
  } catch {
    return DEFAULT_WEATHER_PREFERENCE
  }
}

/** Persists the weather preference for the current runtime. */
export const writeWeatherPreference = async (preference: WeatherPreference): Promise<void> => {
  writeWebPreference(preference)

  if (!hasNativeBridge()) {
    return
  }

  try {
    await Storage.setItem(WEATHER_PREFERENCE_STORAGE_KEY, JSON.stringify(preference))
  } catch {
    // The web copy remains authoritative if native storage is unavailable.
  }
}
