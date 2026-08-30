import {
  createSerialNativeStorageWriter,
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'
import {parseWeatherCitySlug, parseWeatherLocation, type WeatherLocation} from './contract'
import {DEFAULT_WEATHER_LOCATION, LEGACY_WEATHER_LOCATIONS} from './locations'
import {isWeatherSceneMode, type WeatherSceneMode} from './scene-mode'

const WEATHER_PREFERENCE_STORAGE_KEY = 'pomo:weather-preference:v2'
const LEGACY_WEATHER_PREFERENCE_STORAGE_KEY = 'pomo:weather-preference:v1'
let preferenceWriteRevision = 0
const nativeWriter = createSerialNativeStorageWriter()
let pendingNativeWrite: Promise<unknown | null> | null = null

export interface WeatherPreference {
  readonly enabled: boolean
  readonly location: WeatherLocation
  readonly sceneMode: WeatherSceneMode
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

const readWebPreference = (): WeatherPreference | null => {
  const preference = readWebStorageJson(WEATHER_PREFERENCE_STORAGE_KEY, parseWeatherPreference)
  if (preference !== null) {
    return preference
  }

  const legacyPreference = readWebStorageJson(
    LEGACY_WEATHER_PREFERENCE_STORAGE_KEY,
    parseLegacyWeatherPreference,
  )
  if (legacyPreference !== null) {
    writeWebPreference(legacyPreference)
  }
  return legacyPreference
}

const writeWebPreference = (preference: WeatherPreference) => {
  return writeWebStorageJson(WEATHER_PREFERENCE_STORAGE_KEY, preference)
}

const awaitNativeWrites = async (): Promise<void> => {
  const pendingWrite = pendingNativeWrite

  if (pendingWrite === null) {
    return
  }

  await pendingWrite

  if (pendingNativeWrite !== null && pendingNativeWrite !== pendingWrite) {
    await awaitNativeWrites()
  }
}

/** Reads the weather preference from the active browser or app runtime. */
export const readWeatherPreference = async (): Promise<WeatherPreference> => {
  const initialWriteRevision = preferenceWriteRevision

  if (!hasNativeStorageBridge()) {
    return readWebPreference() ?? DEFAULT_WEATHER_PREFERENCE
  }

  try {
    await awaitNativeWrites()
    const nativePreference = await readNativeStorageJson(
      WEATHER_PREFERENCE_STORAGE_KEY,
      parseWeatherPreference,
    )

    const restoredPreference =
      nativePreference ??
      (await readNativeStorageJson(
        LEGACY_WEATHER_PREFERENCE_STORAGE_KEY,
        parseLegacyWeatherPreference,
      ))

    if (preferenceWriteRevision !== initialWriteRevision) {
      return readWeatherPreference()
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

/** Persists the weather preference for the current runtime. */
export const writeWeatherPreference = async (preference: WeatherPreference): Promise<void> => {
  preferenceWriteRevision += 1
  const webWriteError = writeWebPreference(preference)

  if (!hasNativeStorageBridge()) {
    if (webWriteError !== null) {
      throw new Error('Failed to persist weather preference.', {cause: webWriteError})
    }

    return
  }

  const nativeWrite = nativeWriter.write(WEATHER_PREFERENCE_STORAGE_KEY, preference)
  pendingNativeWrite = nativeWrite
  const nativeWriteError = await nativeWrite

  if (pendingNativeWrite === nativeWrite) {
    pendingNativeWrite = null
  }

  if (nativeWriteError !== null) {
    throw new Error('Failed to persist weather preference.', {cause: nativeWriteError})
  }
}
