import {Storage} from '@apps-in-toss/web-framework'

import {getDefaultPSceneStyle, type PSceneStyle} from './scene-style'

const SCENE_STYLE_STORAGE_KEY = 'pomo:focus-room-scene-style:v1'
let preferenceWriteRevision = 0
let nativeWriteQueue = Promise.resolve()

const parseSceneStyle = (storedValue: string | null): PSceneStyle | null => {
  if (storedValue === null) {
    return null
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue)
    return parsedValue === 'original' || parsedValue === 'scribble' ? parsedValue : null
  } catch {
    return null
  }
}

const hasNativeBridge = () => 'ReactNativeWebView' in window

const readWebPreference = (): PSceneStyle | null => {
  try {
    return parseSceneStyle(localStorage.getItem(SCENE_STYLE_STORAGE_KEY))
  } catch {
    return null
  }
}

const writeWebPreference = (sceneStyle: PSceneStyle) => {
  try {
    localStorage.setItem(SCENE_STYLE_STORAGE_KEY, JSON.stringify(sceneStyle))
  } catch {
    // Browser storage is best-effort; the in-memory preference remains active for this session.
  }
}

const enqueueNativeWrite = (sceneStyle: PSceneStyle) => {
  nativeWriteQueue = nativeWriteQueue.then(async () => {
    try {
      await Storage.setItem(SCENE_STYLE_STORAGE_KEY, JSON.stringify(sceneStyle))
    } catch {
      // The authoritative web copy remains available when native storage is unavailable.
    }
  })

  return nativeWriteQueue
}

/** Reads the scene style from storage whose lifetime matches the current runtime. */
export const readPSceneStyle = async (): Promise<PSceneStyle> => {
  const initialWriteRevision = preferenceWriteRevision
  const webPreference = readWebPreference()

  if (webPreference !== null) {
    return webPreference
  }

  if (!hasNativeBridge()) {
    return getDefaultPSceneStyle()
  }

  try {
    const nativePreference = parseSceneStyle(await Storage.getItem(SCENE_STYLE_STORAGE_KEY))

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

  if (!hasNativeBridge()) {
    return
  }

  await enqueueNativeWrite(sceneStyle)
}
