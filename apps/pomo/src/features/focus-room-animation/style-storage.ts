import {
  createSerialNativeStorageWriter,
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

import {getDefaultPSceneStyle, type PSceneStyle} from './scene-style'

const SCENE_STYLE_STORAGE_KEY = 'pomo:focus-room-scene-style:v1'
let preferenceWriteRevision = 0
const nativeWriter = createSerialNativeStorageWriter()

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
    return webPreference
  }

  if (!hasNativeStorageBridge()) {
    return getDefaultPSceneStyle()
  }

  try {
    const nativePreference = await readNativeStorageJson(SCENE_STYLE_STORAGE_KEY, parseSceneStyle)

    if (preferenceWriteRevision !== initialWriteRevision) {
      return readWebPreference() ?? getDefaultPSceneStyle()
    }

    if (nativePreference === null) {
      return getDefaultPSceneStyle()
    }

    writeWebPreference(nativePreference)
    return nativePreference
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

  await nativeWriter.write(SCENE_STYLE_STORAGE_KEY, sceneStyle)
}
