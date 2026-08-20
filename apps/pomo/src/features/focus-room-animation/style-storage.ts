import type {PSceneStyle} from './scene-style'

const SCENE_STYLE_STORAGE_KEY = 'pomo:focus-room-scene-style:v1'
const DEFAULT_SCENE_STYLE: PSceneStyle = 'original'

const parseSceneStyle = (storedValue: string | null): PSceneStyle => {
  if (storedValue === null) {
    return DEFAULT_SCENE_STYLE
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue)
    return parsedValue === 'original' || parsedValue === 'scribble'
      ? parsedValue
      : DEFAULT_SCENE_STYLE
  } catch {
    return DEFAULT_SCENE_STYLE
  }
}

export const readPSceneStyle = (): PSceneStyle => {
  try {
    return parseSceneStyle(localStorage.getItem(SCENE_STYLE_STORAGE_KEY))
  } catch {
    return DEFAULT_SCENE_STYLE
  }
}

export const writePSceneStyle = (sceneStyle: PSceneStyle): void => {
  try {
    localStorage.setItem(SCENE_STYLE_STORAGE_KEY, JSON.stringify(sceneStyle))
  } catch {
    // Browser storage is best-effort; the in-memory preference remains active for this session.
  }
}
