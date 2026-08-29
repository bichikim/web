import {
  createSerialNativeStorageWriter,
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'
import {parseWeatherCitySlug, type WeatherCitySlug} from './contract'
import {isWeatherSceneMode, type WeatherSceneMode} from './scene-mode'

const WEATHER_PREFERENCE_STORAGE_KEY = 'pomo:weather-preference:v1'
let preferenceWriteRevision = 0
const nativeWriter = createSerialNativeStorageWriter()

export interface WeatherPreference {
  readonly citySlug: WeatherCitySlug
  readonly enabled: boolean
  readonly sceneMode: WeatherSceneMode
}

export const DEFAULT_WEATHER_PREFERENCE = {
  citySlug: 'seoul',
  enabled: true,
  sceneMode: 'auto',
} satisfies WeatherPreference

const parseWeatherPreference = (value: unknown): WeatherPreference | null => {
  try {
    if (typeof value !== 'object' || value === null || !('citySlug' in value)) {
      return null
    }

    if (!('enabled' in value) || typeof value.enabled !== 'boolean') {
      return null
    }

    const sceneMode = 'sceneMode' in value ? value.sceneMode : DEFAULT_WEATHER_PREFERENCE.sceneMode
    if (!isWeatherSceneMode(sceneMode)) {
      return null
    }

    return {citySlug: parseWeatherCitySlug(value.citySlug), enabled: value.enabled, sceneMode}
  } catch {
    return null
  }
}

const readWebPreference = (): WeatherPreference | null => {
  return readWebStorageJson(WEATHER_PREFERENCE_STORAGE_KEY, parseWeatherPreference)
}

const writeWebPreference = (preference: WeatherPreference) => {
  writeWebStorageJson(WEATHER_PREFERENCE_STORAGE_KEY, preference)
}

/** Reads the weather preference from the active browser or app runtime. */
export const readWeatherPreference = async (): Promise<WeatherPreference> => {
  const initialWriteRevision = preferenceWriteRevision
  const webPreference = readWebPreference()

  if (webPreference !== null) {
    return webPreference
  }

  if (!hasNativeStorageBridge()) {
    return DEFAULT_WEATHER_PREFERENCE
  }

  try {
    const nativePreference = await readNativeStorageJson(
      WEATHER_PREFERENCE_STORAGE_KEY,
      parseWeatherPreference,
    )

    if (nativePreference === null) {
      return DEFAULT_WEATHER_PREFERENCE
    }

    if (preferenceWriteRevision === initialWriteRevision) {
      writeWebPreference(nativePreference)
    }
    return nativePreference
  } catch {
    return DEFAULT_WEATHER_PREFERENCE
  }
}

/** Persists the weather preference for the current runtime. */
export const writeWeatherPreference = async (preference: WeatherPreference): Promise<void> => {
  preferenceWriteRevision += 1
  writeWebPreference(preference)

  if (!hasNativeStorageBridge()) {
    return
  }

  await nativeWriter.write(WEATHER_PREFERENCE_STORAGE_KEY, preference)
}
