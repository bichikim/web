import {isPlainObject} from 'es-toolkit/predicate'
import {createAuthoritativePreferenceRepository} from '../authoritative-preference'
import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'
import {parseWeatherCitySlug, parseWeatherLocation, type WeatherLocation} from './contract'
import {DEFAULT_WEATHER_LOCATION, LEGACY_WEATHER_LOCATIONS} from './locations'
import {isWeatherSceneMode, type WeatherSceneMode} from './scene-mode'
import {restoreWeatherLocationNames} from './location-names'

export const WEATHER_PREFERENCE_STORAGE_KEY = 'pomo:weather-preference:v2'
const LEGACY_WEATHER_PREFERENCE_STORAGE_KEY = 'pomo:weather-preference:v1'

export interface WeatherPreference {
  readonly enabled: boolean
  readonly location: WeatherLocation
  readonly sceneMode: WeatherSceneMode
}

export interface WeatherPreferenceStorage {
  readonly usesTossStorage: () => boolean
  readonly readToss: (key: string) => Promise<unknown | null>
  readonly readWeb: (key: string) => unknown | null
  readonly writeToss: (key: string, value: unknown) => Promise<void>
  readonly writeWeb: (key: string, value: unknown) => void
}

export interface WeatherPreferenceRepository {
  readonly read: () => Promise<WeatherPreference>
  readonly write: (preference: WeatherPreference) => Promise<void>
}

export interface CreateWeatherPreferenceRepositoryOptions {
  readonly storage: WeatherPreferenceStorage
  readonly restoreLocation?: (location: WeatherLocation) => Promise<WeatherLocation>
}

export const DEFAULT_WEATHER_PREFERENCE = {
  enabled: true,
  location: DEFAULT_WEATHER_LOCATION,
  sceneMode: 'auto',
} satisfies WeatherPreference

export const parseWeatherPreference = (value: unknown): WeatherPreference | null => {
  try {
    if (!isPlainObject(value) || !('location' in value)) {
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
    if (!isPlainObject(value) || !('citySlug' in value)) {
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

  const readTossPreference = async (): Promise<WeatherPreference | null> => {
    const preference = parseWeatherPreference(
      await storage.readToss(WEATHER_PREFERENCE_STORAGE_KEY),
    )

    if (preference !== null) {
      return preference
    }

    return parseLegacyWeatherPreference(
      await storage.readToss(LEGACY_WEATHER_PREFERENCE_STORAGE_KEY),
    )
  }

  const repository = createAuthoritativePreferenceRepository({
    defaultValue: DEFAULT_WEATHER_PREFERENCE,
    readFailureMessage: 'Failed to read weather preference.',
    storage: {
      isNative: () => storage.usesTossStorage(),
      readNative: readTossPreference,
      readWeb: readWebPreference,
      writeNative: (value) => storage.writeToss(WEATHER_PREFERENCE_STORAGE_KEY, value),
      writeWeb: writeWebPreference,
    },
    writeFailureMessage: 'Failed to persist weather preference.',
  })
  const read = () => repository.read()
  const write = (value: WeatherPreference) => repository.write(value)

  const readWithNames = async (): Promise<WeatherPreference> => {
    const saved = await read()
    const {restoreLocation} = options
    if (restoreLocation === undefined) {
      return saved
    }
    try {
      const location = await restoreLocation(saved.location)
      if (location === saved.location) {
        return saved
      }
      const restored = {...saved, location: {...saved.location, names: location.names}}
      await write(restored)
      return restored
    } catch (error: unknown) {
      console.warn('Failed to restore localized weather location names.', error)
      return saved
    }
  }

  return {read: readWithNames, write}
}

const runtimeRepository = createWeatherPreferenceRepository({
  restoreLocation: (location) => restoreWeatherLocationNames({location}),
  storage: {
    readToss: (key) => readTossStorageJson(key, (value) => value),
    readWeb: (key) => readWebStorageJson(key, (value) => value),
    usesTossStorage: hasNativeStorageBridge,
    writeToss: writeTossStorageJson,
    writeWeb(key, value) {
      const error = writeWebStorageJson(key, value)
      if (error !== null) {
        throw error
      }
    },
  },
})

/** Reads the weather preference from the active browser or app runtime. */
export const readWeatherPreference = () => runtimeRepository.read()

/** Persists the weather preference for the current runtime. */
export const writeWeatherPreference = (preference: WeatherPreference) =>
  runtimeRepository.write(preference)
