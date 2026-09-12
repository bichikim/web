import {withPromiseNull} from 'src/utils/with-promise-null'
import {
  createLatestStorageWriter,
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

import {getDefaultPSceneStyle, type PSceneStyle} from './scene-style'

const SCENE_STYLE_STORAGE_KEY = 'pomo:focus-room-scene-style:v1'
let preferenceWriteRevision = 0
const writeLatestToss = createLatestStorageWriter(SCENE_STYLE_STORAGE_KEY, writeTossStorageJson)

const parseSceneStyle = (value: unknown): PSceneStyle | null => {
  return value === 'original' || value === 'scribble' ? value : null
}

const readWebPreference = (): PSceneStyle | null => {
  return readWebStorageJson(SCENE_STYLE_STORAGE_KEY, parseSceneStyle)
}

const writeWebPreference = (sceneStyle: PSceneStyle) => {
  writeWebStorageJson(SCENE_STYLE_STORAGE_KEY, sceneStyle)
}

/** Reads the scene style from storage whose lifetime matches the current runtime. */
export const readPSceneStyle = async (): Promise<PSceneStyle> => {
  const initialWriteRevision = preferenceWriteRevision
  const webPreference = readWebPreference()

  if (webPreference !== null) {
    if (hasNativeStorageBridge()) {
      withPromiseNull(writeLatestToss(webPreference))
    }

    return webPreference
  }

  if (!hasNativeStorageBridge()) {
    return getDefaultPSceneStyle()
  }

  try {
    const tossPreference = await readTossStorageJson(SCENE_STYLE_STORAGE_KEY, parseSceneStyle)

    if (preferenceWriteRevision !== initialWriteRevision) {
      return readWebPreference() ?? getDefaultPSceneStyle()
    }

    if (tossPreference === null) {
      return getDefaultPSceneStyle()
    }

    writeWebPreference(tossPreference)
    return tossPreference
  } catch {
    return readWebPreference() ?? getDefaultPSceneStyle()
  }
}

/** Persists the scene style until the host app or browser data is removed. */
export const writePSceneStyle = async (sceneStyle: PSceneStyle): Promise<void> => {
  preferenceWriteRevision += 1
  writeWebPreference(sceneStyle)

  if (!hasNativeStorageBridge()) {
    return
  }

  await withPromiseNull(writeLatestToss(sceneStyle))
}
