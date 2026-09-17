import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

import {createPScenePreferencesRepository} from './create-p-scene-preferences-repository'
import type {PScenePreferences} from './model'

const preserveStoredValue = (value: unknown) => value
const runtimeRepository = createPScenePreferencesRepository({
  storage: {
    readToss: (key) => readTossStorageJson(key, preserveStoredValue),
    readWeb: (key) => readWebStorageJson(key, preserveStoredValue),
    usesTossStorage: hasNativeStorageBridge,
    writeToss: writeTossStorageJson,
    writeWeb: writeWebStorageJson,
  },
})

/** Reads scene preferences from storage whose lifetime matches the current runtime. */
export const readPScenePreferences = (): Promise<PScenePreferences> => runtimeRepository.read()

/** Persists scene preferences until the host app or browser data is removed. */
export const writePScenePreferences = (preferences: PScenePreferences): Promise<void> =>
  runtimeRepository.write(preferences)
