import {createTossWebStorageAdapter} from 'src/utils/runtime-storage'

import {createPScenePreferencesRepository} from './create-p-scene-preferences-repository'
import type {PScenePreferences} from './model'

export {
  parsePScenePreferences,
  SCENE_PREFERENCES_STORAGE_KEY,
} from './create-p-scene-preferences-repository'

const runtimeRepository = createPScenePreferencesRepository({
  storage: {
    ...createTossWebStorageAdapter({writeWebMode: 'return-error'}),
  },
})

/** Reads scene preferences from storage whose lifetime matches the current runtime. */
export const readPScenePreferences = (): Promise<PScenePreferences> => runtimeRepository.read()

/** Persists scene preferences until the host app or browser data is removed. */
export const writePScenePreferences = (preferences: PScenePreferences): Promise<void> =>
  runtimeRepository.write(preferences)
