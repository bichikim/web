import {usePreference} from 'src/hooks/use-preference'
import type {PreferenceStorage} from 'src/hooks/use-preference/types'
import {getDefaultPSceneStyle, type PSceneStyle, type PSceneStyleController} from './scene-style'
import {readPSceneStyle, writePSceneStyle} from './style-storage'
import {parseSceneStyle} from './parse-scene-style'

const SCENE_STYLE_STORAGE_KEY = 'pomo:focus-room-scene-style:v1'

/** Adapts the scene-style repository to the shared preference provider. */
const sceneStylePreferenceStorage: PreferenceStorage = {
  read: () => readPSceneStyle().then(parseSceneStyle),
  write: (_key, value) => {
    const sceneStyle = parseSceneStyle(value)
    return sceneStyle === null ? null : writePSceneStyle(sceneStyle).then(() => null)
  },
}

/** Owns the provider-backed persisted focus-room scene style. */
export const usePSceneStyle = (): PSceneStyleController => {
  const [storedSceneStyle, setStoredSceneStyle] = usePreference<PSceneStyle>({
    defaultValue: getDefaultPSceneStyle(),
    key: SCENE_STYLE_STORAGE_KEY,
    parse: parseSceneStyle,
    storage: sceneStylePreferenceStorage,
  })
  const sceneStyle = () => storedSceneStyle() ?? getDefaultPSceneStyle()
  const isReady = () => storedSceneStyle() !== null

  return {isReady, onSceneStyleChange: setStoredSceneStyle, sceneStyle}
}
