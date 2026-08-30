import {
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeNativeStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'
import {parseWeatherCitySlug, parseWeatherLocation, type WeatherLocation} from './contract'
import {DEFAULT_WEATHER_LOCATION, LEGACY_WEATHER_LOCATIONS} from './locations'
import {isWeatherSceneMode, type WeatherSceneMode} from './scene-mode'

const WEATHER_PREFERENCE_STORAGE_KEY = 'pomo:weather-preference:v2'
const LEGACY_WEATHER_PREFERENCE_STORAGE_KEY = 'pomo:weather-preference:v1'

export interface WeatherPreference {
  readonly enabled: boolean
  readonly location: WeatherLocation
  readonly sceneMode: WeatherSceneMode
}

export interface WeatherPreferenceStorage {
  readonly isNative: () => boolean
  readonly readNative: (key: string) => Promise<unknown | null>
  readonly readWeb: (key: string) => unknown | null
  readonly writeNative: (key: string, value: unknown) => Promise<void>
  readonly writeWeb: (key: string, value: unknown) => void
}

export interface WeatherPreferenceRepository {
  readonly read: () => Promise<WeatherPreference>
  readonly write: (preference: WeatherPreference) => Promise<void>
}

export interface CreateWeatherPreferenceRepositoryOptions {
  readonly storage: WeatherPreferenceStorage
}

export const DEFAULT_WEATHER_PREFERENCE = {
  enabled: true,
  location: DEFAULT_WEATHER_LOCATION,
  sceneMode: 'auto',
} satisfies WeatherPreference

const parseWeatherPreference = (value: unknown): WeatherPreference | null => {
  try {
    if (typeof value !== 'object' || value === null || !('location' in value)) {
      return null
    }

    if (!('enabled' in value) || typeof value.enabled !== 'boolean') {
      return null
    }

    const sceneMode = 'sceneMode' in value ? value.sceneMode : DEFAULT_WEATHER_PREFERENCE.sceneMode
    if (!isWeatherSceneMode(sceneMode)) {
      return null
    }

    return {enabled: value.enabled, location: parseWeatherLocation(value.location), sceneMode}
  } catch {
    return null
  }
}

const parseLegacyWeatherPreference = (value: unknown): WeatherPreference | null => {
  try {
    if (typeof value !== 'object' || value === null || !('citySlug' in value)) {
      return null
    }
    if (!('enabled' in value) || typeof value.enabled !== 'boolean') {
      return null
    }

    const citySlug = parseWeatherCitySlug(value.citySlug)
    const sceneMode = 'sceneMode' in value ? value.sceneMode : DEFAULT_WEATHER_PREFERENCE.sceneMode
    if (!isWeatherSceneMode(sceneMode)) {
      return null
    }

    return {enabled: value.enabled, location: LEGACY_WEATHER_LOCATIONS[citySlug], sceneMode}
  } catch {
    return null
  }
}

/** Creates the weather preference persistence policy over one storage boundary. */
export const createWeatherPreferenceRepository = (
  options: CreateWeatherPreferenceRepositoryOptions,
): WeatherPreferenceRepository => {
  const {storage} = options
  let preferenceWriteRevision = 0
  let nativeWriteQueue = Promise.resolve()

  const writeWebPreference = (preference: WeatherPreference) => {
    try {
      storage.writeWeb(WEATHER_PREFERENCE_STORAGE_KEY, preference)
      return null
    } catch (error: unknown) {
      return error
    }
  }

  const readWebPreference = (): WeatherPreference | null => {
    const preference = parseWeatherPreference(storage.readWeb(WEATHER_PREFERENCE_STORAGE_KEY))

    if (preference !== null) {
      return preference
    }

    const legacyPreference = parseLegacyWeatherPreference(
      storage.readWeb(LEGACY_WEATHER_PREFERENCE_STORAGE_KEY),
    )

    if (legacyPreference !== null) {
      writeWebPreference(legacyPreference)
    }

    return legacyPreference
  }

  const readNativePreference = async (): Promise<WeatherPreference | null> => {
    const preference = parseWeatherPreference(
      await storage.readNative(WEATHER_PREFERENCE_STORAGE_KEY),
    )

    if (preference !== null) {
      return preference
    }

    return parseLegacyWeatherPreference(
      await storage.readNative(LEGACY_WEATHER_PREFERENCE_STORAGE_KEY),
    )
  }

  const enqueueNativeWrite = (preference: WeatherPreference) => {
    const nativeWrite = nativeWriteQueue.then(() =>
      storage.writeNative(WEATHER_PREFERENCE_STORAGE_KEY, preference),
    )
    nativeWriteQueue = nativeWrite.catch(() => undefined)
    return nativeWrite
  }

  const read = async (): Promise<WeatherPreference> => {
    const initialWriteRevision = preferenceWriteRevision

    if (!storage.isNative()) {
      return readWebPreference() ?? DEFAULT_WEATHER_PREFERENCE
    }

    try {
      await nativeWriteQueue
      const restoredPreference = await readNativePreference()

      if (preferenceWriteRevision !== initialWriteRevision) {
        return read()
      }

      if (restoredPreference === null) {
        writeWebPreference(DEFAULT_WEATHER_PREFERENCE)
        return DEFAULT_WEATHER_PREFERENCE
      }

      writeWebPreference(restoredPreference)
      return restoredPreference
    } catch (error: unknown) {
      throw new Error('Failed to read weather preference.', {cause: error})
    }
  }

  const write = async (preference: WeatherPreference): Promise<void> => {
    preferenceWriteRevision += 1
    const webWriteError = writeWebPreference(preference)

    if (!storage.isNative()) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist weather preference.', {cause: webWriteError})
      }

      return
    }

    try {
      await enqueueNativeWrite(preference)
    } catch (error: unknown) {
      throw new Error('Failed to persist weather preference.', {cause: error})
    }
  }

  return {read, write}
}

const preserveStoredValue = (value: unknown) => value
const runtimeStorage = {
  isNative: hasNativeStorageBridge,
  readNative: (key: string) => readNativeStorageJson(key, preserveStoredValue),
  readWeb: (key: string) => readWebStorageJson(key, preserveStoredValue),
  writeNative: writeNativeStorageJson,
  writeWeb(key: string, value: unknown) {
    const error = writeWebStorageJson(key, value)

    if (error !== null) {
      throw error
    }
  },
} satisfies WeatherPreferenceStorage
const runtimeRepository = createWeatherPreferenceRepository({storage: runtimeStorage})

/** Reads the weather preference from the active browser or app runtime. */
export const readWeatherPreference = () => runtimeRepository.read()

/** Persists the weather preference for the current runtime. */
export const writeWeatherPreference = (preference: WeatherPreference) =>
  runtimeRepository.write(preference)
