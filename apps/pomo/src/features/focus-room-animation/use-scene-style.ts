import {usePreference} from 'src/hooks/use-preference'
import type {PreferenceStorage} from 'src/utils/preference-storage'
import {getDefaultPSceneStyle, type PSceneStyle, type PSceneStyleController} from './scene-style'
import {readPSceneStyle, writePSceneStyle} from './style-storage'

const SCENE_STYLE_STORAGE_KEY = 'pomo:focus-room-scene-style:v1'

const parsePSceneStyle = (value: unknown): PSceneStyle | null => {
  return value === 'original' || value === 'scribble' ? value : null
}

/** Adapts the scene-style repository to the shared preference provider. */
const sceneStylePreferenceStorage: PreferenceStorage = {
  read: () => readPSceneStyle().then(parsePSceneStyle),
  write: (_key, value) => {
    const sceneStyle = parsePSceneStyle(value)
    return sceneStyle === null ? null : writePSceneStyle(sceneStyle).then(() => null)
  },
}

/** Owns the provider-backed persisted focus-room scene style. */
export const usePSceneStyle = (): PSceneStyleController => {
  const [storedSceneStyle, setStoredSceneStyle] = usePreference<PSceneStyle>({
    defaultValue: getDefaultPSceneStyle(),
    key: SCENE_STYLE_STORAGE_KEY,
    parse: parsePSceneStyle,
    storage: sceneStylePreferenceStorage,
  })
  const sceneStyle = () => storedSceneStyle() ?? getDefaultPSceneStyle()
  const isReady = () => storedSceneStyle() !== null

  return {isReady, onSceneStyleChange: setStoredSceneStyle, sceneStyle}
}
