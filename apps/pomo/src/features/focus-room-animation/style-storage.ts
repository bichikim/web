import {restorePreferredValue} from '../preference-persistence'
import {withPromiseNull} from 'src/utils/with-promise-null'
import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

import {getDefaultPSceneStyle, type PSceneStyle} from './scene-style'

const SCENE_STYLE_STORAGE_KEY = 'pomo:focus-room-scene-style:v1'
const parseSceneStyle = (value: unknown): PSceneStyle | null => {
  return value === 'original' || value === 'scribble' ? value : null
}

export interface PSceneStyleStorage {
  readonly getDefault: () => PSceneStyle
  readonly usesTossStorage: () => boolean
  readonly readToss: (key: string) => Promise<unknown>
  readonly readWeb: (key: string) => unknown
  readonly writeToss: (key: string, value: unknown) => Promise<void>
  readonly writeWeb: (key: string, value: unknown) => void
}

export interface PSceneStyleRepository {
  readonly read: () => Promise<PSceneStyle>
  readonly write: (sceneStyle: PSceneStyle) => Promise<void>
}

/** Reads and writes scene styles using the supplied runtime storage. */
export const createPSceneStyleRepository = (storage: PSceneStyleStorage): PSceneStyleRepository => {
  const readWebPreference = (): PSceneStyle | null => {
    return parseSceneStyle(storage.readWeb(SCENE_STYLE_STORAGE_KEY))
  }

  const writeWebPreference = (sceneStyle: PSceneStyle) => {
    storage.writeWeb(SCENE_STYLE_STORAGE_KEY, sceneStyle)
  }

  /** Reads the scene style from storage whose lifetime matches the current runtime. */
  const read = async (): Promise<PSceneStyle> =>
    restorePreferredValue({
      preferred: readWebPreference(),
      repair: async (value) => {
        if (storage.usesTossStorage()) {
          await withPromiseNull(storage.writeToss(SCENE_STYLE_STORAGE_KEY, value))
        }
      },
      restore: async () => {
        if (!storage.usesTossStorage()) {
          return storage.getDefault()
        }
        try {
          const tossPreference = parseSceneStyle(await storage.readToss(SCENE_STYLE_STORAGE_KEY))
          if (tossPreference === null) {
            return storage.getDefault()
          }
          writeWebPreference(tossPreference)
          return tossPreference
        } catch {
          return readWebPreference() ?? storage.getDefault()
        }
      },
    })

  /** Persists the scene style until the host app or browser data is removed. */
  const write = async (sceneStyle: PSceneStyle): Promise<void> => {
    writeWebPreference(sceneStyle)

    if (!storage.usesTossStorage()) {
      return
    }

    await withPromiseNull(storage.writeToss(SCENE_STYLE_STORAGE_KEY, sceneStyle))
  }

  return {read, write}
}

const runtimeRepository = createPSceneStyleRepository({
  getDefault: getDefaultPSceneStyle,
  readToss: (key) => readTossStorageJson(key, (value) => value),
  readWeb: (key) => readWebStorageJson(key, (value) => value),
  usesTossStorage: hasNativeStorageBridge,
  writeToss: writeTossStorageJson,
  writeWeb: writeWebStorageJson,
})

/** Reads the scene style from storage whose lifetime matches the current runtime. */
export const readPSceneStyle = (): Promise<PSceneStyle> => runtimeRepository.read()

/** Persists the scene style until the host app or browser data is removed. */
export const writePSceneStyle = (sceneStyle: PSceneStyle): Promise<void> =>
  runtimeRepository.write(sceneStyle)
