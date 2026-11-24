import {
  createLatestStorageWriter,
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

import {getDefaultPSceneStyle, type PSceneStyle} from './scene-style'
import {parseSceneStyle} from './parse-scene-style'

const SCENE_STYLE_STORAGE_KEY = 'pomo:focus-room-scene-style:v1'
const NATIVE_WRITE_FAILURE_KEY = 'pomo:focus-room-scene-style:native-write-failure:v1'

export interface PSceneStyleStorage {
  readonly getDefault: () => PSceneStyle
  readonly usesTossStorage: () => boolean
  readonly readToss: (key: string) => Promise<unknown>
  readonly readWeb: (key: string) => unknown
  readonly writeToss: (key: string, value: unknown) => Promise<void>
  readonly writeWeb: (key: string, value: unknown) => unknown
}

export interface PSceneStyleRepository {
  readonly read: () => Promise<PSceneStyle>
  readonly write: (sceneStyle: PSceneStyle) => Promise<void>
}

/** Reads and writes scene styles using the supplied runtime storage. */
export const createPSceneStyleRepository = (storage: PSceneStyleStorage): PSceneStyleRepository => {
  let writeRevision = 0
  let nativeWriteFailed = false
  const writeNative = createLatestStorageWriter(SCENE_STYLE_STORAGE_KEY, storage.writeToss)
  const readWebPreference = (): PSceneStyle | null => {
    return parseSceneStyle(storage.readWeb(SCENE_STYLE_STORAGE_KEY))
  }

  const writeWebPreference = (sceneStyle: PSceneStyle) => {
    return storage.writeWeb(SCENE_STYLE_STORAGE_KEY, sceneStyle)
  }

  /** Reads the scene style from storage whose lifetime matches the current runtime. */
  const read = async (): Promise<PSceneStyle> => {
    const initialWriteRevision = writeRevision
    if (!storage.usesTossStorage()) {
      return readWebPreference() ?? storage.getDefault()
    }

    if (nativeWriteFailed || storage.readWeb(NATIVE_WRITE_FAILURE_KEY) === true) {
      const webPreference = readWebPreference()
      if (webPreference !== null) {
        return webPreference
      }
    }

    try {
      const storedPreference = await storage.readToss(SCENE_STYLE_STORAGE_KEY)
      if (initialWriteRevision !== writeRevision) {
        return readWebPreference() ?? storage.getDefault()
      }

      const tossPreference = parseSceneStyle(storedPreference)
      if (tossPreference === null) {
        return readWebPreference() ?? storage.getDefault()
      }

      writeWebPreference(tossPreference)
      return tossPreference
    } catch {
      return readWebPreference() ?? storage.getDefault()
    }
  }

  /** Persists the scene style until the host app or browser data is removed. */
  const write = async (sceneStyle: PSceneStyle): Promise<void> => {
    const webError = writeWebPreference(sceneStyle)
    const revision = (writeRevision += 1)

    if (!storage.usesTossStorage()) {
      return
    }

    try {
      await writeNative(sceneStyle)
      if (writeRevision === revision) {
        nativeWriteFailed = false
        storage.writeWeb(NATIVE_WRITE_FAILURE_KEY, false)
      }
    } catch (error: unknown) {
      if (webError !== null && webError !== undefined) {
        throw error
      }
      if (writeRevision === revision) {
        nativeWriteFailed = true
        storage.writeWeb(NATIVE_WRITE_FAILURE_KEY, true)
      }
    }
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
